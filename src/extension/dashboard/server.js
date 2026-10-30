"use strict";
// Local HTTP boundary. No editor tracking or activity writes belong here.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { publicFiles } = require("./assets");
function createDashboardServer({ vscode, stats, onVisibility }) {
  const assetRoot = path.join(__dirname, "../../..");
  const token = crypto.randomBytes(32).toString("hex");
  let server,
    serverReady,
    port,
    disposed = false;
  function reply(response, code, value) {
    response.writeHead(code, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(value));
  }
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
      if (url.pathname === "/api/stats") {
        if (request.method !== "GET")
          return reply(response, 405, { error: "METHOD_NOT_ALLOWED" });
        if (request.headers["x-devlog-visible"] === "1")
          onVisibility(Date.now());
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
        if (
          !/^application\/json(?:;|$)/i.test(
            request.headers["content-type"] || "",
          )
        )
          return reply(response, 415, { error: "INVALID_CONTENT_TYPE" });
        let body = "",
          size = 0,
          rejected = false;
        request.on("data", (chunk) => {
          size += chunk.length;
          if (size > 1024) {
            if (!rejected) {
              rejected = true;
              reply(response, 413, { error: "REQUEST_TOO_LARGE" });
            }
          } else if (!rejected) body += chunk;
        });
        request.on("end", async () => {
          if (rejected) return;
          let goal;
          try {
            goal = JSON.parse(body)?.dailyGoalMinutes;
            if (!Number.isInteger(goal) || goal < 15 || goal > 720)
              throw Error();
          } catch {
            return reply(response, 400, { error: "INVALID_GOAL" });
          }
          try {
            await vscode.workspace
              .getConfiguration("devlog")
              .update(
                "dailyGoalMinutes",
                goal,
                vscode.ConfigurationTarget.Global,
              );
            reply(response, 200, {
              goal: vscode.workspace
                .getConfiguration("devlog")
                .get("dailyGoalMinutes", 120),
            });
          } catch {
            reply(response, 500, { error: "SETTINGS_WRITE_FAILED" });
          }
        });
        return;
      }
      return reply(response, 404, { error: "NOT_FOUND" });
    }
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
