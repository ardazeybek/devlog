"use strict";
function createStatusBar(vscode, context) {
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10,
  );
  status.command = "devlog.open";
  status.text = "$(pulse) devlog";
  status.show();
  context.subscriptions.push(status);
  return function updateStatus({
    storageError,
    paused,
    active,
    lastInput,
    now,
  }) {
    status.text = storageError
      ? "$(warning) devlog"
      : paused
        ? "$(debug-pause) devlog"
        : "$(pulse) devlog";
    status.tooltip = storageError
      ? "Could not save activity. Check disk space and folder permissions."
      : paused
        ? "Tracking paused. Click to open devlog."
        : active && now - lastInput <= 60000
          ? "Tracking " + active.language + ". Click to open devlog."
          : "Waiting for an edit. Saved and unsaved files are supported. Click to open devlog.";
  };
}
module.exports = { createStatusBar };
