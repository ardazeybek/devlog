"use strict";
// Composition root: connects editor tracking, persistence, rewards and presentation.
const vscode = require("vscode");
const fs = require("node:fs");
const {
  aggregate,
  restoreDays,
  deleteDay,
} = require("./storage/activity-store");
const { dayKey } = require("./tracking/rules");
const { summarizeWeek, isSummaryDue } = require("./summary/weekly-summary");
const { RewardTracker } = require("./rewards/reward-tracker");
const { createActivityTracker } = require("./tracking/activity-tracker");
const { createDashboardServer } = require("./dashboard/server");
const { createStatusBar } = require("./ui/status-bar");
const { registerLauncher } = require("./ui/launcher");
const { createJournalStore } = require("./journal/journal-store");
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
  const journal = createJournalStore(root);
  const dashboard = createDashboardServer({
    vscode,
    stats,
    restore: (backup) => restoreDays(root, backup),
    deleteDay: (date) => removeDay(date),
    journal,
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
  // Reads an object-valued devlog setting, ignoring anything malformed.
  function readObject(name) {
    const value = vscode.workspace.getConfiguration("devlog").get(name, {});
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }
  function stats() {
    const combined = aggregate(root);
    return {
      days: combined.days,
      goal: vscode.workspace
        .getConfiguration("devlog")
        .get("dailyGoalMinutes", 120),
      weeklyGoal: vscode.workspace
        .getConfiguration("devlog")
        .get("weeklyGoalMinutes", 600),
      paused: tracker.paused,
      trackingStatus: tracker.status,
      projectAliases: readObject("projectAliases"),
      projectGroups: readObject("projectGroups"),
      journal: journal.list(),
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

  // Deletes a past day from every window's view; today stays editable.
  function removeDay(date) {
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date >= dayKey()
    )
      return false;
    deleteDay(root, date);
    return true;
  }

  // Shows last week's summary on Sunday evenings, once per week.
  function checkWeeklySummary() {
    const enabled = vscode.workspace
      .getConfiguration("devlog")
      .get("weeklySummaryNotification", true);
    const now = new Date();
    const store = context.globalState;
    if (
      !enabled ||
      !store ||
      !isSummaryDue(now, store.get("lastWeeklySummary"))
    )
      return;
    const text = summarizeWeek(aggregate(root).days, now);
    store.update("lastWeeklySummary", dayKey(now));
    Promise.resolve(
      vscode.window.showInformationMessage(
        "devlog — " + text,
        "Open dashboard",
      ),
    )
      .then((action) => {
        if (action === "Open dashboard") dashboard.open("stats");
      })
      .catch(() => {});
  }
  // Re-checks every 30 minutes with chained timeouts so it never claims a shared interval.
  let summaryTimer;
  function scheduleSummary() {
    summaryTimer = setTimeout(
      () => {
        checkWeeklySummary();
        scheduleSummary();
      },
      30 * 60 * 1000,
    );
    summaryTimer.unref?.();
  }
  scheduleSummary();

  registerLauncher(
    vscode,
    context,
    (view) => dashboard.open(view),
    () => tracker.togglePause(),
  );
  context.subscriptions.push({
    dispose() {
      clearTimeout(summaryTimer);
      tracker.dispose();
      dashboard.dispose();
    },
  });
}
module.exports = { activate };
