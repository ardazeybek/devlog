"use strict";
// Composition root: connects editor tracking, persistence, rewards and presentation.
const vscode = require("vscode");
const fs = require("node:fs");
const { aggregate } = require("./storage/activity-store");
const { RewardTracker } = require("./rewards/reward-tracker");
const { createActivityTracker } = require("./tracking/activity-tracker");
const { createDashboardServer } = require("./dashboard/server");
const { createStatusBar } = require("./ui/status-bar");
const { registerLauncher } = require("./ui/launcher");
function activate(context) {
  const root = context.globalStorageUri.fsPath;
  try {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  } catch {
    vscode.window.showErrorMessage(
      "devlog cannot access its data folder. Check folder permissions and reload VS Code.",
    );
    return;
  }
  const onStatus = createStatusBar(vscode, context);
  const tracker = createActivityTracker({
    vscode,
    context,
    root,
    onActivity: checkRewards,
    onStatus,
  });
  const dashboard = createDashboardServer({
    vscode,
    stats,
    onVisibility: (time) => {
      dashboardVisibleAt = time;
    },
  });
  let rewards;
  try {
    rewards = new RewardTracker(root, aggregate(root).days);
  } catch {}
  let dashboardVisibleAt = -Infinity;
  function checkRewards() {
    if (tracker.storageError) return;
    try {
      const events = rewards?.poll(aggregate(root).days) || [];
      if (!events.length || Date.now() - dashboardVisibleAt < 20000) return;
      const title = events.find((event) => event.kind === "title");
      const message = title
        ? "New title: " + title.name + ". Nice work!"
        : "You did it! " +
          events[0].name +
          (events.length > 1 ? " and " + (events.length - 1) + " more." : ".");
      Promise.resolve(
        vscode.window.showInformationMessage(
          "devlog — " + message,
          "View achievements",
        ),
      )
        .then((action) => {
          if (action === "View achievements") dashboard.open("awards");
        })
        .catch(() => {});
    } catch {}
  }
  function languageIds() {
    const ids = new Set();
    for (const extension of vscode.extensions?.all || []) {
      for (const language of extension.packageJSON?.contributes?.languages ||
        [])
        if (typeof language.id === "string") ids.add(language.id);
    }
    return [...ids].sort();
  }
  function stats() {
    const combined = aggregate(root);
    return {
      days: combined.days,
      goal: vscode.workspace
        .getConfiguration("devlog")
        .get("dailyGoalMinutes", 120),
      paused: tracker.paused,
      live: true,
      languages: languageIds(),
      rewardEvents: rewards?.recent() || [],
      issue: tracker.storageError
        ? "STORAGE_WRITE_FAILED"
        : combined.unreadableFiles
          ? "PARTIAL_DATA"
          : null,
    };
  }

  registerLauncher(
    vscode,
    context,
    (view) => dashboard.open(view),
    () => tracker.togglePause(),
  );
  context.subscriptions.push({
    dispose() {
      tracker.dispose();
      dashboard.dispose();
    },
  });
}
module.exports = { activate };
