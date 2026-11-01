"use strict";
// Verifies sessions, branches, journal notes, project aliases and groups.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  aggregate,
  atomicWrite,
} = require("../../src/extension/storage/activity-store");
const {
  createJournalStore,
} = require("../../src/extension/journal/journal-store");
const { parseHead } = require("../../src/extension/tracking/git-branch");

// Creates an empty temporary storage folder.
function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "devlog-data-"));
}

test("aggregation merges sessions and branches and drops invalid sessions", () => {
  const root = tempRoot();
  try {
    atomicWrite(path.join(root, "a.json"), {
      version: 1,
      days: {
        "2026-03-01": {
          seconds: 60,
          branches: { "app\u001fmain": 60 },
          sessions: [
            { start: 600, end: 610, project: "app", language: "js" },
            { start: 900, end: 800, project: "app", language: "js" },
          ],
        },
      },
    });
    atomicWrite(path.join(root, "b.json"), {
      version: 1,
      days: {
        "2026-03-01": { seconds: 30, branches: { "app\u001fmain": 30 } },
      },
    });
    const day = aggregate(root).days["2026-03-01"];
    assert.equal(day.branches["app\u001fmain"], 90);
    assert.deepEqual(day.sessions, [
      { start: 600, end: 610, project: "app", language: "js" },
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("journal notes are validated, listed newest first and removable", () => {
  const root = tempRoot();
  try {
    const journal = createJournalStore(root);
    assert.equal(journal.add({ date: "2026-03-01", text: "   " }), null);
    assert.equal(journal.add({ date: "bad", text: "x" }), null);
    const first = journal.add({
      date: "2026-03-01",
      project: "app",
      text: "Auth done",
    });
    const second = journal.add({ date: "2026-03-02", text: "Tests" });
    assert.deepEqual(
      journal.list().map((note) => note.id),
      [second.id, first.id],
    );
    assert.equal(journal.remove(first.id), true);
    assert.equal(journal.remove(first.id), false);
    assert.equal(journal.list().length, 1);
    assert.deepEqual(aggregate(root).days, Object.create(null));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("HEAD files yield branch names, detached heads or unknown", () => {
  assert.equal(parseHead("ref: refs/heads/feature/login\n"), "feature/login");
  assert.equal(parseHead("4f2c9a1b\n"), "detached");
});

test("alias and group helpers merge names without changing stored data", async () => {
  const file = pathToFileURL(
    path.join(__dirname, "../../web/dashboard/analytics.js"),
  ).href;
  const a = await import(file);
  const days = { "2026-03-01": { projects: { old: 60, app: 30 } } };
  const remapped = a.remapProjects(days, { old: "app" });
  assert.deepEqual(remapped["2026-03-01"].projects, { app: 90 });
  assert.deepEqual(days["2026-03-01"].projects, { old: 60, app: 30 });
  assert.deepEqual(
    a.groupTotals(
      [
        ["course", 60],
        ["api", 30],
      ],
      { Learning: ["course"] },
    ),
    [
      ["Learning", 60],
      ["api", 30],
    ],
  );
  assert.deepEqual(
    a.branchRows(["2026-03-01"], {
      "2026-03-01": { branches: { "app\u001ffeature": 120 } },
    }),
    [{ project: "app", branch: "feature", seconds: 120 }],
  );
});
