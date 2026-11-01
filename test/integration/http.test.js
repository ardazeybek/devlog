const Module = require("module"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-test-"));
const commands = {};
let url,
  edit,
  goal = 120;
const original = Module._load;
Module._load = function (n, ...args) {
  if (n === "vscode")
    return {
      ConfigurationTarget: { Global: 1 },
      TreeItem: class {
        constructor(label) {
          this.label = label;
        }
      },
      ThemeIcon: class {},
      StatusBarAlignment: { Left: 1 },
      window: {
        createTreeView: () => ({
          onDidChangeVisibility: () => ({ dispose() {} }),
          dispose() {},
        }),
        state: { focused: true },
        createStatusBarItem: () => ({ show() {}, dispose() {} }),
        onDidChangeWindowState: () => ({ dispose() {} }),
        onDidChangeActiveTextEditor: () => ({ dispose() {} }),
      },
      workspace: {
        getConfiguration: () => ({
          get: (k, d) => (k === "dailyGoalMinutes" ? goal : d),
          update: async (k, v, target) => {
            assert.equal(k, "dailyGoalMinutes");
            assert.equal(target, 1);
            goal = v;
          },
        }),
        onDidChangeTextDocument: (f) => ((edit = f), { dispose() {} }),
      },
      commands: {
        registerCommand: (n, f) => ((commands[n] = f), { dispose() {} }),
      },
      env: { openExternal: (u) => (url = u) },
      Uri: { parse: (s) => s },
    };
  return original.call(this, n, ...args);
};
const ctx = { globalStorageUri: { fsPath: root }, subscriptions: [] };
require("../../src/extension").activate(ctx);
setTimeout(async () => {
  try {
    assert.equal(
      url,
      undefined,
      "Sidebar initialization must not open a browser",
    );
    await commands["devlog.open"]();
    const u = new URL(url),
      token = u.hash.slice(1);
    u.hash = "";
    assert.equal((await fetch(u + "api/stats")).status, 401);
    const r = await fetch(u + "api/stats", {
      headers: { Authorization: "Bearer " + token },
    });
    assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).days, {});
    assert.equal((await fetch(u)).status, 200);
    assert.equal((await fetch(u + "unknown")).status, 404);
    const post = (g, extra = {}) =>
      fetch(u + "api/settings", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          ...extra,
        },
        body: JSON.stringify({ dailyGoalMinutes: g }),
      });
    assert.equal((await post(90)).status, 200);
    assert.equal(
      (
        await (
          await fetch(u + "api/stats", {
            headers: { Authorization: "Bearer " + token },
          })
        ).json()
      ).goal,
      90,
    );
    for (const invalid of [0, 14, 721, 90.5, "90", null])
      assert.equal((await post(invalid)).status, 400);
    assert.equal(
      (await post(90, { Origin: "https://example.com" })).status,
      403,
    );
    assert.equal(
      (await post(90, { Authorization: "Bearer invalid" })).status,
      401,
    );
    assert.equal(
      (await post(90, { "Content-Type": "text/plain" })).status,
      415,
    );
    assert.equal(
      (
        await fetch(u + "api/settings", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(u + "api/stats", {
          headers: {
            Authorization: "Bearer " + token,
            Origin: "https://example.com",
          },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(u + "api/settings", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: "x".repeat(1025),
        })
      ).status,
      413,
    );
    assert.equal((await fetch(u + "package.json")).status, 404);
    const badHost = await new Promise((resolve, reject) => {
      const request = require("node:http").get(
        new URL("api/stats", u),
        { headers: { Authorization: "Bearer " + token, Host: "example.com" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
    });
    assert.equal(badHost, 403);
    const html = await fetch(u);
    assert(
      html.headers
        .get("content-security-policy")
        .includes("frame-ancestors 'none'"),
    );
    assert.equal(html.headers.get("cache-control"), "no-store");
    // Follow the actual HTML and ES import graph through the real server.
    // This catches missing package assets, wrong module paths and MIME regressions.
    const page = await (await fetch(u)).text();
    assert.match(page, /type="module"/);
    const queue = [...page.matchAll(/(?:src|href)="([^"#]+)"/g)].map(
      (match) => new URL(match[1], u),
    );
    const visited = new Set();
    while (queue.length) {
      const asset = queue.shift();
      if (asset.origin !== u.origin || visited.has(asset.href)) continue;
      visited.add(asset.href);
      const response = await fetch(asset);
      assert.equal(response.status, 200, asset.pathname);
      if (asset.pathname.endsWith(".js")) {
        assert.match(response.headers.get("content-type"), /javascript/);
        const source = await response.text();
        for (const match of source.matchAll(/from\s+["']([^"']+)["']/g))
          queue.push(new URL(match[1], asset));
      } else if (asset.pathname.endsWith(".css")) {
        assert.match(response.headers.get("content-type"), /text\/css/);
      }
      const head = await fetch(asset, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), "");
    }
    assert(
      visited.size > 20,
      "The full browser module and style graph was visited",
    );
    for (const privatePath of [
      "src/extension/index.js",
      ".reward-notifications",
      "constructor",
      "__proto__",
    ])
      assert.equal((await fetch(new URL(privatePath, u))).status, 404);
    console.log(
      "Explicit launcher, HTTP authentication, settings, origin, host, size and routing checks passed.",
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    ctx.subscriptions.forEach((s) => s.dispose());
    Module._load = original;
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 200);
