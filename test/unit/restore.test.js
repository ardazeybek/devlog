"use strict";
// Verifies backup restore adds only missing days and is safe to repeat.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  aggregate,
  atomicWrite,
  restoreDays,
} = require("../../src/extension/storage/activity-store");

test("restore adds missing days, keeps existing days and ignores repeats", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-restore-"));
  try {
    atomicWrite(path.join(root, "local.json"), {
      version: 1,
      days: { "2026-03-01": { seconds: 600, projects: { app: 600 } } },
    });
    const backup = {
      version: 1,
      days: {
        "2026-03-01": { seconds: 9999 },
        "2026-03-02": { seconds: 1200, projects: { api: 1200 }, typed: -5 },
        "not-a-date": { seconds: 60 },
      },
    };
    assert.deepEqual(restoreDays(root, backup), { restored: 1, skipped: 1 });
    const merged = aggregate(root).days;
    assert.equal(merged["2026-03-01"].seconds, 600);
    assert.equal(merged["2026-03-02"].seconds, 1200);
    assert.equal(merged["2026-03-02"].typed, 0);
    assert.deepEqual(restoreDays(root, backup), { restored: 0, skipped: 2 });
    assert.equal(aggregate(root).days["2026-03-02"].seconds, 1200);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("restore rejects documents that are not version-1 backups", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-restore-"));
  try {
    assert.equal(restoreDays(root, { version: 2, days: {} }), null);
    assert.equal(restoreDays(root, null), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deleted days disappear everywhere until a backup brings them back", () => {
  const { deleteDay } = require("../../src/extension/storage/activity-store");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devlog-delete-"));
  try {
    atomicWrite(path.join(root, "local.json"), {
      version: 1,
      days: { "2026-03-01": { seconds: 600 }, "2026-03-02": { seconds: 300 } },
    });
    deleteDay(root, "2026-03-01");
    assert.equal(aggregate(root).days["2026-03-01"], undefined);
    assert.equal(aggregate(root).days["2026-03-02"].seconds, 300);
    assert.deepEqual(
      restoreDays(root, {
        version: 1,
        days: { "2026-03-01": { seconds: 600 } },
      }),
      { restored: 1, skipped: 0 },
    );
    assert.equal(aggregate(root).days["2026-03-01"].seconds, 600);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
