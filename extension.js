'use strict';
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { dayKey, classify, eligibleDocument, trackedLanguage } = require('./core');
const { emptyDay, aggregate, atomicWrite } = require('./storage');
const { RewardTracker } = require('./rewards');

function activate(context) {
  const root = context.globalStorageUri.fsPath;
  try { fs.mkdirSync(root, { recursive: true, mode: 0o700 }); }
  catch { vscode.window.showErrorMessage('devlog cannot access its data folder. Check folder permissions and reload VS Code.'); return; }
  const file = path.join(root, crypto.randomUUID() + '.json');
  const data = { version: 1, days: Object.create(null) };
  let paused = false, lastInput = 0, lastTick = Date.now(), active = null, storageError = false;
  let server, serverReady, port, disposed = false;
  let rewards;
  try { rewards = new RewardTracker(root, aggregate(root).days); } catch {}
  let dashboardVisibleAt = -Infinity;
  function checkRewards() {
    if (storageError) return;
    try {
      const events = rewards?.poll(aggregate(root).days) || [];
      if (!events.length || Date.now() - dashboardVisibleAt < 20000) return;
      const title = events.find(event => event.kind === 'title');
      const message = title ? 'New title: ' + title.name + '. Nice work!' : 'You did it! ' + events[0].name + (events.length > 1 ? ' and ' + (events.length - 1) + ' more.' : '.');
      Promise.resolve(vscode.window.showInformationMessage('devlog — ' + message, 'View achievements')).then(action => { if (action === 'View achievements') openPanel('awards'); }).catch(() => {});
    } catch {}
  }
  const token = crypto.randomBytes(32).toString('hex');
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  status.command = 'devlog.open'; status.text = '$(pulse) devlog'; status.show();
  context.subscriptions.push(status);

  function save() {
    try { atomicWrite(file, data); storageError = false; }
    catch { storageError = true; status.text = '$(warning) devlog'; status.tooltip = 'Could not save activity. Check available disk space and folder permissions.'; }
  }
  function bucket() { return data.days[dayKey()] ??= emptyDay(); }
  function languageIds() {
    const ids = new Set();
    for (const extension of vscode.extensions?.all || []) {
      for (const language of extension.packageJSON?.contributes?.languages || []) if (typeof language.id === 'string') ids.add(language.id);
    }
    return [...ids].sort();
  }
  function stats() {
    const combined = aggregate(root);
    return { days: combined.days, goal: vscode.workspace.getConfiguration('devlog').get('dailyGoalMinutes', 120),
      paused, live: true, languages: languageIds(), rewardEvents: rewards?.recent() || [],
      issue: storageError ? 'STORAGE_WRITE_FAILED' : combined.unreadableFiles ? 'PARTIAL_DATA' : null };
  }
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (paused || !vscode.window.state.focused || !event.contentChanges.length || vscode.window.activeTextEditor?.document !== event.document) return;
    if (!eligibleDocument(event.document, vscode.workspace.getConfiguration('devlog').get('excludedPaths', []))) return;
    const change = classify(event.contentChanges, event.reason);
    const day = bucket();
    for (const field of Object.keys(change)) day[field] += change[field];
    if (change.edits) {
      const folder = vscode.workspace.getWorkspaceFolder(event.document.uri);
      active = { project: folder ? folder.name : event.document.uri.scheme === 'untitled' ? 'Unsaved files' : 'Standalone files',
        language: trackedLanguage(event.document), uri: event.document.uri.toString() };
      lastInput = Date.now();
    }
    save();
  }));
  const reset = () => { lastInput = 0; active = null; lastTick = Date.now(); };
  context.subscriptions.push(vscode.window.onDidChangeWindowState(reset));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(reset));
  const timer = setInterval(() => {
    const now = Date.now(), elapsed = (now - lastTick) / 1000; lastTick = now;
    if (!paused && active && vscode.window.state.focused && now - lastInput <= 60000 && elapsed > 0 && elapsed <= 10 && vscode.window.activeTextEditor?.document.uri.toString() === active.uri) {
      const day = bucket(); day.seconds += elapsed;
      day.projects[active.project] = (day.projects[active.project] || 0) + elapsed;
      day.languages[active.language] = (day.languages[active.language] || 0) + elapsed;
      save();
      checkRewards();
    }
    status.text = storageError ? '$(warning) devlog' : paused ? '$(debug-pause) devlog' : '$(pulse) devlog';
    status.tooltip = storageError ? 'Could not save activity. Check disk space and folder permissions.' : paused ? 'Tracking paused. Click to open devlog.' : active && now - lastInput <= 60000 ? 'Tracking ' + active.language + '. Click to open devlog.' : 'Waiting for an edit. Saved and unsaved files are supported. Click to open devlog.';
  }, 5000);

  function reply(response, code, value) {
    response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(value));
  }
  function handle(request, response) {
    const origin = `http://127.0.0.1:${port}`;
    if (request.headers.host !== `127.0.0.1:${port}`) return reply(response, 403, { error: 'INVALID_HOST' });
    let url; try { url = new URL(request.url, origin); } catch { return reply(response, 400, { error: 'INVALID_REQUEST' }); }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (url.pathname.startsWith('/api/')) {
      if (request.headers.authorization !== `Bearer ${token}`) return reply(response, 401, { error: 'SESSION_EXPIRED' });
      if (request.headers.origin && request.headers.origin !== origin) return reply(response, 403, { error: 'INVALID_ORIGIN' });
      if (url.pathname === '/api/stats') {
        if (request.method !== 'GET') return reply(response, 405, { error: 'METHOD_NOT_ALLOWED' });
        if (request.headers['x-devlog-visible'] === '1') dashboardVisibleAt = Date.now();
        else if (request.headers['x-devlog-visible'] === '0') dashboardVisibleAt = -Infinity;
        try { return reply(response, 200, stats()); } catch { return reply(response, 500, { error: 'STORAGE_UNAVAILABLE' }); }
      }
      if (url.pathname === '/api/settings') {
        if (request.method !== 'POST') return reply(response, 405, { error: 'METHOD_NOT_ALLOWED' });
        if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) return reply(response, 415, { error: 'INVALID_CONTENT_TYPE' });
        let body = '', size = 0, rejected = false;
        request.on('data', chunk => {
          size += chunk.length;
          if (size > 1024) { if (!rejected) { rejected = true; reply(response, 413, { error: 'REQUEST_TOO_LARGE' }); } }
          else if (!rejected) body += chunk;
        });
        request.on('end', async () => {
          if (rejected) return;
          let goal;
          try { goal = JSON.parse(body)?.dailyGoalMinutes; if (!Number.isInteger(goal) || goal < 15 || goal > 720) throw Error(); }
          catch { return reply(response, 400, { error: 'INVALID_GOAL' }); }
          try {
            await vscode.workspace.getConfiguration('devlog').update('dailyGoalMinutes', goal, vscode.ConfigurationTarget.Global);
            reply(response, 200, { goal: vscode.workspace.getConfiguration('devlog').get('dailyGoalMinutes', 120) });
          } catch { reply(response, 500, { error: 'SETTINGS_WRITE_FAILED' }); }
        });
        return;
      }
      return reply(response, 404, { error: 'NOT_FOUND' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    const files = { '/': 'index.html', '/app.js': 'app.js', '/motion.js': 'motion.js', '/achievements.js': 'achievements.js', '/languages.js': 'languages.js', '/controls.js': 'controls.js', '/celebrations.js': 'celebrations.js', '/style.css': 'style.css' };
    let name = files[url.pathname];
    // Icons are the only directory served; never serve arbitrary files or data.
    if (/^\/icons\/[a-z0-9-]+\.svg$/.test(url.pathname)) name = url.pathname.slice(1);
    if (!name) return reply(response, 404, { error: 'NOT_FOUND' });
    try {
      const content = fs.readFileSync(path.join(__dirname, 'web', name));
      response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch { reply(response, 404, { error: 'NOT_FOUND' }); }
  }
  async function openPanel(view) {
    if (disposed) return;
    if (!serverReady) {
      serverReady = new Promise((resolve, reject) => {
        server = http.createServer(handle);
        server.requestTimeout = 10000;
        server.on('error', error => { serverReady = null; reject(error); });
        server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(); });
      });
    }
    try {
      await serverReady;
      const opened = await vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${port}/${view === 'awards' ? '?tab=awards' : ''}#${token}`));
      if (opened === false) vscode.window.showErrorMessage('devlog could not open your browser. Check your default browser and try Open Dashboard again.');
    } catch { vscode.window.showErrorMessage('devlog could not start its local dashboard. Reload VS Code and try Open Dashboard again.'); }
  }
  const tree = vscode.window.createTreeView('devlog.launcher', { treeDataProvider: {
    getTreeItem: item => item,
    getChildren: () => [
      Object.assign(new vscode.TreeItem('Open Dashboard'), { description: 'Open in your browser', command: { command: 'devlog.open', title: 'Open Dashboard' }, iconPath: new vscode.ThemeIcon('link-external') }),
      Object.assign(new vscode.TreeItem('Pause / Resume Tracking'), { command: { command: 'devlog.pause', title: 'Pause / Resume Tracking' }, iconPath: new vscode.ThemeIcon('debug-pause') }),
      Object.assign(new vscode.TreeItem('Settings'), { command: { command: 'workbench.action.openSettings', title: 'Settings', arguments: ['devlog'] }, iconPath: new vscode.ThemeIcon('settings-gear') })
    ]
  } });
  context.subscriptions.push(tree, vscode.commands.registerCommand('devlog.open', openPanel),
    vscode.commands.registerCommand('devlog.pause', () => {
      paused = !paused; reset();
      vscode.window.showInformationMessage(paused ? 'devlog tracking paused.' : 'devlog tracking resumed.');
    }), { dispose() { disposed = true; clearInterval(timer); save(); server?.close(); } });
}
module.exports = { activate };
