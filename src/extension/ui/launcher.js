"use strict";
function registerLauncher(vscode, context, openPanel, togglePause) {
  const tree = vscode.window.createTreeView("devlog.launcher", {
    treeDataProvider: {
      getTreeItem: (item) => item,
      getChildren: () => [
        Object.assign(new vscode.TreeItem("Open Dashboard"), {
          description: "Open in your browser",
          command: { command: "devlog.open", title: "Open Dashboard" },
          iconPath: new vscode.ThemeIcon("link-external"),
        }),
        Object.assign(new vscode.TreeItem("Pause / Resume Tracking"), {
          command: {
            command: "devlog.pause",
            title: "Pause / Resume Tracking",
          },
          iconPath: new vscode.ThemeIcon("debug-pause"),
        }),
        Object.assign(new vscode.TreeItem("Settings"), {
          command: {
            command: "workbench.action.openSettings",
            title: "Settings",
            arguments: ["devlog"],
          },
          iconPath: new vscode.ThemeIcon("settings-gear"),
        }),
      ],
    },
  });

  context.subscriptions.push(
    tree,
    vscode.commands.registerCommand("devlog.open", openPanel),
    vscode.commands.registerCommand("devlog.pause", () => {
      const paused = togglePause();
      vscode.window.showInformationMessage(
        paused ? "devlog tracking paused." : "devlog tracking resumed.",
      );
    }),
  );
}
module.exports = { registerLauncher };
