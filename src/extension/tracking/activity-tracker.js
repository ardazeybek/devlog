"use strict";
const path = require("node:path");
const crypto = require("node:crypto");
const {
  dayKey,
  classify,
  eligibleDocument,
  trackedLanguage,
} = require("./rules");
const { emptyDay, atomicWrite } = require("../storage/activity-store");
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
    storageError = false;
  function save() {
    try {
      atomicWrite(file, data);
      storageError = false;
    } catch {
      storageError = true;
      onStatus({ storageError, paused, active, lastInput, now: Date.now() });
    }
  }
  function bucket() {
    return (data.days[dayKey()] ??= emptyDay());
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
      const change = classify(event.contentChanges, event.reason);
      const day = bucket();
      for (const field of Object.keys(change)) day[field] += change[field];
      if (change.edits) {
        const folder = vscode.workspace.getWorkspaceFolder(event.document.uri);
        active = {
          project: folder
            ? folder.name
            : event.document.uri.scheme === "untitled"
              ? "Unsaved files"
              : "Standalone files",
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
    lastTick = Date.now();
  };
  context.subscriptions.push(vscode.window.onDidChangeWindowState(reset));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(reset));
  const timer = setInterval(() => {
    const now = Date.now(),
      elapsed = (now - lastTick) / 1000;
    lastTick = now;
    if (
      !paused &&
      active &&
      vscode.window.state.focused &&
      now - lastInput <= 60000 &&
      elapsed > 0 &&
      elapsed <= 10 &&
      vscode.window.activeTextEditor?.document.uri.toString() === active.uri
    ) {
      const day = bucket();
      day.seconds += elapsed;
      day.projects[active.project] =
        (day.projects[active.project] || 0) + elapsed;
      day.languages[active.language] =
        (day.languages[active.language] || 0) + elapsed;
      save();
      onActivity();
    }
    onStatus({ storageError, paused, active, lastInput, now });
  }, 5000);

  return {
    get paused() {
      return paused;
    },
    get storageError() {
      return storageError;
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
