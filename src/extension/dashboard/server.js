"use strict";
// Local HTTP boundary. No editor tracking or activity writes belong here.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { publicFiles } = require("./assets");
const SETTINGS = Object.freeze({
  dailyGoalMinutes: { min: 15, max: 720, fallback: 120 },
  weeklyGoalMinutes: { min: 60, max: 10080, fallback: 600 },
});
const BACKUP_LIMIT = 10 * 1024 * 1024;
function createDashboardServer({
  vscode,
  stats,
  restore,
  journal,
  deleteDay,
  onVisibility,
}) {
  const assetRoot = path.join(__dirname, "../../..");
  const token = crypto.randomBytes(32).toString("hex");
  let server,
    serverReady,
    port,
    disposed = false;

  // Sends a JSON response with the given status code.
  function reply(response, code, value) {
    response.writeHead(code, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(value));
  }

  // Tells whether the request declares a JSON body.
  function isJson(request) {
    return /^application\/json(?:;|$)/i.test(
      request.headers["content-type"] || "",
    );
  }

  // Collects a request body up to a byte limit; resolves null when it is too large.
  function readBody(request, limit) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      request.on("data", (chunk) => {
        size += chunk.length;
        if (size > limit) return resolve(null);
        chunks.push(chunk);
      });
      request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      request.on("error", reject);
    });
  }

  // Reads a JSON body, runs the action, and replies with the status and payload it returns.
  async function postJson(request, response, limit, action) {
    if (!isJson(request))
      return reply(response, 415, { error: "INVALID_CONTENT_TYPE" });
    const body = await readBody(request, limit);
    if (body === null)
      return reply(response, 413, { error: "REQUEST_TOO_LARGE" });
    let value;
    try {
      value = JSON.parse(body);
    } catch {
      return reply(response, 400, { error: "INVALID_JSON" });
    }
    try {
      const [code, payload] = await action(value);
      reply(response, code, payload);
    } catch {
      reply(response, 500, { error: "WRITE_FAILED" });
    }
  }

  // Reads the configuration value for one setting, using its default.
  function readSetting(name) {
    return vscode.workspace
      .getConfiguration("devlog")
      .get(name, SETTINGS[name].fallback);
  }

  // Validates one goal and writes it to the global devlog configuration.
  function saveSetting(request, response) {
    return postJson(request, response, 1024, async (fields) => {
      const names = Object.keys(SETTINGS).filter((name) =>
        Object.hasOwn(fields && typeof fields === "object" ? fields : {}, name),
      );
      const name = names[0];
      const value = name ? fields[name] : undefined;
      const { min, max } = SETTINGS[name] || {};
      if (
        names.length !== 1 ||
        !Number.isInteger(value) ||
        value < min ||
        value > max
      )
        return [400, { error: "INVALID_GOAL" }];
      try {
        await vscode.workspace
          .getConfiguration("devlog")
          .update(name, value, vscode.ConfigurationTarget.Global);
        return [
          200,
          {
            goal: readSetting("dailyGoalMinutes"),
            weeklyGoal: readSetting("weeklyGoalMinutes"),
          },
        ];
      } catch {
        return [500, { error: "SETTINGS_WRITE_FAILED" }];
      }
    });
  }

  // Imports a backup file and reports how many days were added.
  function restoreBackup(request, response) {
    return postJson(request, response, BACKUP_LIMIT, (backup) => {
      try {
        const result = restore(backup);
        return result ? [200, result] : [400, { error: "INVALID_BACKUP" }];
      } catch {
        return [500, { error: "RESTORE_FAILED" }];
      }
    });
  }

  // Adds or removes a coding journal note.
  function journalRequest(request, response, url) {
    if (url.pathname === "/api/journal") {
      if (request.method === "GET")
        return reply(response, 200, { notes: journal.list() });
      if (request.method !== "POST")
        return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return postJson(request, response, 4096, (input) => {
        const note = journal.add(input);
        return note ? [201, { note }] : [400, { error: "INVALID_NOTE" }];
      });
    }
    if (request.method !== "POST")
      return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
    return postJson(request, response, 1024, (input) => {
      const id = typeof input?.id === "string" ? input.id : "";
      if (!id || id.length > 64) return [400, { error: "INVALID_NOTE" }];
      return [200, { removed: journal.remove(id) }];
    });
  }

  // Handles the authenticated JSON API routes.
  function handleApi(request, response, url) {
    if (url.pathname === "/api/stats") {
      if (request.method !== "GET")
        return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
      if (request.headers["x-devlog-visible"] === "1") onVisibility(Date.now());
      else if (request.headers["x-devlog-visible"] === "0")
        onVisibility(-Infinity);
      try {
        return reply(response, 200, stats());
      } catch {
        return reply(response, 500, { error: "STORAGE_UNAVAILABLE" });
      }
    }
    if (url.pathname === "/api/settings") {
      if (request.method !== "POST")
        return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return saveSetting(request, response);
    }
    if (url.pathname === "/api/restore") {
      if (request.method !== "POST")
        return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return restoreBackup(request, response);
    }
    if (url.pathname === "/api/days/delete") {
      if (request.method !== "POST")
        return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
      return postJson(request, response, 1024, (input) =>
        deleteDay(input?.date)
          ? [200, { deleted: true }]
          : [400, { error: "INVALID_DAY" }],
      );
    }
    if (
      url.pathname === "/api/journal" ||
      url.pathname === "/api/journal/remove"
    )
      return journalRequest(request, response, url);
    return reply(response, 404, { error: "NOT_FOUND" });
  }

  // Routes every request after the host check and security headers.
  function handle(request, response) {
    const origin = `http://127.0.0.1:${port}`;
    if (request.headers.host !== `127.0.0.1:${port}`)
      return reply(response, 403, { error: "INVALID_HOST" });
    let url;
    try {
      url = new URL(request.url, origin);
    } catch {
      return reply(response, 400, { error: "INVALID_REQUEST" });
    }
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (url.pathname.startsWith("/api/")) {
      if (request.headers.authorization !== `Bearer ${token}`)
        return reply(response, 401, { error: "SESSION_EXPIRED" });
      if (request.headers.origin && request.headers.origin !== origin)
        return reply(response, 403, { error: "INVALID_ORIGIN" });
      return handleApi(request, response, url);
    }
    return serveFile(request, response, url);
  }

  // Serves one explicitly allowlisted public file.
  function serveFile(request, response, url) {
    if (request.method !== "GET" && request.method !== "HEAD")
      return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
    const files = publicFiles;
    const name = Object.hasOwn(files, url.pathname)
      ? files[url.pathname]
      : undefined;
    if (!name) return reply(response, 404, { error: "NOT_FOUND" });
    try {
      const content = fs.readFileSync(path.join(assetRoot, name));
      response.setHeader(
        "Content-Type",
        name.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : name.endsWith(".css")
            ? "text/css; charset=utf-8"
            : name.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html; charset=utf-8",
      );
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      reply(response, 404, { error: "NOT_FOUND" });
    }
  }

  // Starts the loopback server on first use and opens the browser at the requested view.
  async function openPanel(view) {
    if (disposed) return;
    if (!serverReady) {
      serverReady = new Promise((resolve, reject) => {
        server = http.createServer(handle);
        server.requestTimeout = 10000;
        server.on("error", (error) => {
          serverReady = null;
          reject(error);
        });
        server.listen(0, "127.0.0.1", () => {
          port = server.address().port;
          resolve();
        });
      });
    }
    try {
      await serverReady;
      const opened = await vscode.env.openExternal(
        vscode.Uri.parse(
          `http://127.0.0.1:${port}/${view === "awards" ? "?tab=awards" : ""}#${token}`,
        ),
      );
      if (opened === false)
        vscode.window.showErrorMessage(
          "devlog could not open your browser. Check your default browser and try Open Dashboard again.",
        );
    } catch {
      vscode.window.showErrorMessage(
        "devlog could not start its local dashboard. Reload VS Code and try Open Dashboard again.",
      );
    }
  }

  return {
    open: openPanel,
    dispose() {
      disposed = true;
      server?.close();
    },
  };
}
module.exports = { createDashboardServer };
