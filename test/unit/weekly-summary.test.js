"use strict";
// Verifies the weekly summary text and when it is due.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  summarizeWeek,
  isSummaryDue,
  weekStartKey,
} = require("../../src/extension/summary/weekly-summary");

test("summary covers Monday through today and names the top project", () => {
  const now = new Date(2026, 10, 1, 19); // Sunday, 1 Nov 2026
  const days = {
    "2026-10-26": { seconds: 3600, projects: { api: 3600 } },
    "2026-10-27": { seconds: 900, projects: { web: 900 } },
    "2026-11-01": { seconds: 1800, projects: { api: 1800 } },
    "2026-10-18": { seconds: 99999, projects: { old: 99999 } },
  };
  assert.equal(
    summarizeWeek(days, now),
    "This week: 1h 45m across 3 active days. Most time went to api.",
  );
});

test("summary is due on Sunday evening once per week", () => {
  const sunday = new Date(2026, 10, 1, 19);
  assert.equal(weekStartKey(sunday), "2026-10-26");
  assert.equal(isSummaryDue(sunday, null), true);
  assert.equal(isSummaryDue(sunday, "2026-10-26"), false);
  assert.equal(isSummaryDue(new Date(2026, 10, 1, 9), null), false);
  assert.equal(isSummaryDue(new Date(2026, 10, 2, 19), null), false);
});
