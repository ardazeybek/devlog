"use strict";
// Verifies dashboard date ranges, period comparisons, heatmap levels and CSV export.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const file = pathToFileURL(
  path.join(__dirname, "../../web/dashboard/analytics.js"),
).href;

test("presets, year and custom ranges select the expected keys", async () => {
  const a = await import(file);
  const today = new Date(2026, 2, 10, 12);
  assert.deepEqual(a.rangeKeys({ preset: "7" }, today), [
    "2026-03-04",
    "2026-03-05",
    "2026-03-06",
    "2026-03-07",
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
  ]);
  assert.equal(a.rangeKeys({ preset: "year" }, today).length, 69);
  assert.equal(a.rangeKeys({ preset: "all" }, today, "2026-03-09").length, 2);
  assert.deepEqual(
    a.rangeKeys(
      { preset: "custom", start: "2026-02-28", end: "2026-03-01" },
      today,
    ),
    ["2026-02-28", "2026-03-01"],
  );
  assert.deepEqual(
    a.rangeKeys(
      { preset: "custom", start: "2026-03-05", end: "2026-03-01" },
      today,
    ),
    [],
  );
});

test("week and month comparisons use the same number of elapsed days", async () => {
  const a = await import(file);
  const pair = a.periodPair("month", new Date(2026, 2, 31, 12));
  assert.equal(pair.current.length, 31);
  assert.equal(pair.previous.length, 28);
  const week = a.periodPair("week", new Date(2026, 2, 11, 12));
  assert.deepEqual(week.current, ["2026-03-09", "2026-03-10", "2026-03-11"]);
  assert.deepEqual(week.previous, ["2026-03-02", "2026-03-03", "2026-03-04"]);
});

test("totals, heat levels and CSV rows follow stored records", async () => {
  const a = await import(file);
  const days = {
    "2026-03-01": {
      seconds: 3600,
      projects: { "Dev, Log": 3600 },
      languages: { js: 3600 },
    },
    "2026-03-02": { seconds: 60, projects: {}, languages: { plaintext: 60 } },
  };
  const totals = a.totalsFor(["2026-03-01", "2026-03-02"], days);
  assert.equal(totals.seconds, 3660);
  assert.equal(totals.activeDays, 1);
  assert.deepEqual(totals.languages, [["js", 3600]]);
  assert.equal(a.heatLevel(0, 120), 0);
  assert.equal(a.heatLevel(3600, 120), 3);
  assert.equal(a.heatLevel(7200, 120), 4);
  assert.equal(a.heatLevel(900, 120), 1);
  assert.equal(
    a.projectCsv(["2026-03-01"], days),
    'date,project,seconds\r\n2026-03-01,"Dev, Log",3600\r\n',
  );
});

test("comparison sentences describe change and the top project", async () => {
  const a = await import(file);
  const lines = a.describePeriods({
    label: "This week",
    previousLabel: "last week",
    current: {
      seconds: 7200,
      activeDays: 2,
      projects: [["api", 7200]],
      languages: [],
    },
    previous: { seconds: 3600, activeDays: 1, projects: [], languages: [] },
  });
  assert.equal(lines[0], "This week: 2h 0m of active coding on 2 active days.");
  assert.equal(lines[1], "That is 100% more than last week (1h 0m).");
  assert.equal(lines[2], "Most time went to api (100%).");
});

test("backups keep only date keys and are version 1", async () => {
  const a = await import(file);
  const doc = a.backupDocument(
    { "2026-03-01": { seconds: 1 }, bogus: {} },
    new Date(0),
  );
  assert.deepEqual(Object.keys(doc.days), ["2026-03-01"]);
  assert.equal(doc.version, 1);
});
