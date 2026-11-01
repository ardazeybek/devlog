"use strict";
// Per-window activity record: edits, active time, sessions, branches and tracking status.
const path = require("node:path");
const crypto = require("node:crypto");
const {
  dayKey,
  classify,
  eligibleDocument,
  trackedLanguage,
} = require("./rules");
const { branchOf } = require("./git-branch");
const { emptyDay, atomicWrite } = require("../storage/activity-store");
const SESSION_GAP_MS = 120000;
const MAX_SESSIONS_PER_DAY = 500;

// Returns minutes since local midnight for a timestamp.
function minuteOfDay(time) {
  const date = new Date(time);
  return date.getHours() * 60 + date.getMinutes();
}

// Reads a number setting, keeping it inside its allowed range.
function boundedSetting(vscode, name, fallback, min, max) {
  const value = vscode.workspace.getConfiguration("devlog").get(name, fallback);
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function createActivityTracker({
  vscode,
  context,
  root,
  onActivity,
  onStatus,
}) {
  const file = path.join(root, crypto.randomUUID() + ".json");
  const data = { version: 1, days: Object.create(null) };
  let paused = false,
    lastInput = 0,
    lastTick = Date.now(),
    active = null,
    session = null,
    storageError = false,
    status = "waiting";

  // Saves the record and reports storage failures to the status bar.
  function save() {
    try {
      atomicWrite(file, data);
      storageError = false;
    } catch {
      storageError = true;
      onStatus({ storageError, paused, active, lastInput, now: Date.now() });
    }
  }

  // Returns today's bucket, creating it on first use.
  function bucket() {
    return (data.days[dayKey()] ??= emptyDay());
  }

  // Returns the project label and workspace folder for a document.
  function projectOf(document) {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (folder) return { name: folder.name, folderPath: folder.uri.fsPath };
    return {
      name:
        document.uri.scheme === "untitled"
          ? "Unsaved files"
          : "Standalone files",
      folderPath: null,
    };
  }

  // Lists project names the user chose to leave out of tracking.
  function excludedProjects() {
    return vscode.workspace
      .getConfiguration("devlog")
      .get("excludedProjects", []);
  }

  // Tells whether a project name is in the user's exclusion list.
  function isExcluded(name) {
    return excludedProjects().includes(name);
  }

  // Extends the open session or starts a new one, capped per day.
  function recordSession(now, project, language) {
    const key = dayKey(new Date(now));
    const minute = minuteOfDay(now);
    if (
      session &&
      session.key === key &&
      session.project === project &&
      session.language === language &&
      now - session.lastMs <= SESSION_GAP_MS
    ) {
      session.record.end = minute;
      session.lastMs = now;
      return;
    }
    const day = (data.days[key] ??= emptyDay());
    day.sessions ??= [];
    if (day.sessions.length >= MAX_SESSIONS_PER_DAY) {
      session = null;
      return;
    }
    const record = { start: minute, end: minute, project, language };
    day.sessions.push(record);
    session = { key, project, language, lastMs: now, record };
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        paused ||
        !vscode.window.state.focused ||
        !event.contentChanges.length ||
        vscode.window.activeTextEditor?.document !== event.document
      )
        return;
      if (
        !eligibleDocument(
          event.document,
          vscode.workspace.getConfiguration("devlog").get("excludedPaths", []),
        )
      )
        return;
      const { name, folderPath } = projectOf(event.document);
      if (isExcluded(name)) return;
      const change = classify(event.contentChanges, event.reason);
      const day = bucket();
      for (const field of Object.keys(change)) day[field] += change[field];
      if (change.edits) {
        active = {
          project: name,
          branch: folderPath ? branchOf(folderPath) : null,
          language: trackedLanguage(event.document),
          uri: event.document.uri.toString(),
        };
        lastInput = Date.now();
      }
      save();
    }),
  );
  const reset = () => {
    lastInput = 0;
    active = null;
    session = null;
    lastTick = Date.now();
  };
  context.subscriptions.push(vscode.window.onDidChangeWindowState(reset));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(reset));

  // Works out why time is or is not being counted right now.
  function statusAt(now) {
    if (paused) return "paused";
    if (!vscode.window.state.focused) return "unfocused";
    if (!active) return "waiting";
    if (isExcluded(active.project)) return "excluded";
    const idleMs =
      boundedSetting(vscode, "idleTimeoutSeconds", 60, 15, 600) * 1000;
    if (now - lastInput > idleMs) return "idle";
    return "counting";
  }

  // Credits one elapsed slice of time to the active project, language and branch.
  function credit(now, elapsed) {
    const day = bucket();
    day.seconds += elapsed;
    day.projects[active.project] =
      (day.projects[active.project] || 0) + elapsed;
    day.languages[active.language] =
      (day.languages[active.language] || 0) + elapsed;
    if (active.branch) {
      const key = active.project + "\u001f" + active.branch;
      day.branches[key] = (day.branches[key] || 0) + elapsed;
    }
    recordSession(now, active.project, active.language);
    save();
    onActivity();
  }

  const timer = setInterval(() => {
    const now = Date.now(),
      elapsed = (now - lastTick) / 1000;
    lastTick = now;
    status = statusAt(now);
    if (
      status === "counting" &&
      elapsed > 0 &&
      elapsed <= 10 &&
      vscode.window.activeTextEditor?.document.uri.toString() === active.uri
    )
      credit(now, elapsed);
    onStatus({ storageError, paused, active, lastInput, now });
  }, 5000);

  return {
    get paused() {
      return paused;
    },
    get storageError() {
      return storageError;
    },
    get status() {
      return paused ? "paused" : status;
    },
    togglePause() {
      paused = !paused;
      reset();
      return paused;
    },
    dispose() {
      clearInterval(timer);
      save();
    },
  };
}
module.exports = { createActivityTracker };
