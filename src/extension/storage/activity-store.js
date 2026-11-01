"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const DELETED_FILE = "deleted-days.json";
const COUNTERS = [
  "seconds",
  "typed",
  "added",
  "removed",
  "bulk",
  "edits",
  "manualSeconds",
];
function emptyDay() {
  return {
    seconds: 0,
    typed: 0,
    added: 0,
    removed: 0,
    bulk: 0,
    edits: 0,
    manualSeconds: 0,
    projects: Object.create(null),
    languages: Object.create(null),
    branches: Object.create(null),
  };
}
function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}
// Keeps a session only when its minutes and names are valid.
function cleanSession(item) {
  const valid =
    item &&
    Number.isInteger(item.start) &&
    Number.isInteger(item.end) &&
    item.start >= 0 &&
    item.end >= item.start &&
    item.end <= 1440 &&
    typeof item.project === "string" &&
    item.project.length <= 200 &&
    typeof item.language === "string" &&
    item.language.length <= 100;
  return valid
    ? {
        start: item.start,
        end: item.end,
        project: item.project,
        language: item.language,
      }
    : null;
}

// Copies one day record, keeping only valid counters and dictionary entries.
function sanitizeDay(row) {
  const day = emptyDay();
  for (const counter of COUNTERS) day[counter] = positive(row[counter]);
  for (const field of ["projects", "languages", "branches"]) {
    if (!row[field] || typeof row[field] !== "object") continue;
    for (const [key, value] of Object.entries(row[field])) {
      const amount = positive(value);
      if (amount > 0) day[field][key] = amount;
    }
  }
  if (Array.isArray(row.sessions))
    day.sessions = row.sessions.map(cleanSession).filter(Boolean);
  return day;
}
// Lists day keys the user deleted; aggregation hides them in every window.
function readDeleted(root) {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(root, DELETED_FILE), "utf8"),
    );
    if (data.version === 2 && Array.isArray(data.days))
      return new Set(data.days.filter((day) => typeof day === "string"));
  } catch {}
  return new Set();
}

// Saves the deleted-day list; the file is version 2, so activity aggregation skips it.
function writeDeleted(root, deleted) {
  atomicWrite(path.join(root, DELETED_FILE), {
    version: 2,
    days: [...deleted].sort(),
  });
}

// Removes one day from every saved version-1 file, leaving other days untouched.
function stripDay(root, date) {
  for (const name of fs
    .readdirSync(root)
    .filter((file) => file.endsWith(".json"))) {
    const file = path.join(root, name);
    try {
      const record = JSON.parse(fs.readFileSync(file, "utf8"));
      if (record.version === 1 && record.days?.[date]) {
        delete record.days[date];
        atomicWrite(file, record);
      }
    } catch {}
  }
}

// Deletes one past day: its data is removed from files and hidden from every window.
function deleteDay(root, date) {
  const deleted = readDeleted(root);
  deleted.add(date);
  writeDeleted(root, deleted);
  stripDay(root, date);
}

function aggregate(root) {
  const days = Object.create(null);
  const deleted = readDeleted(root);
  let unreadableFiles = 0;
  for (const file of fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
      if (
        record.version !== 1 ||
        !record.days ||
        typeof record.days !== "object"
      )
        continue;
      for (const [date, row] of Object.entries(record.days)) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !row ||
          typeof row !== "object" ||
          deleted.has(date)
        )
          continue;
        const day = (days[date] ??= emptyDay());
        for (const counter of COUNTERS) day[counter] += positive(row[counter]);
        for (const field of ["projects", "languages", "branches"]) {
          if (!row[field] || typeof row[field] !== "object") continue;
          for (const [key, value] of Object.entries(row[field])) {
            const amount = positive(value);
            if (amount > 0) day[field][key] = (day[field][key] || 0) + amount;
          }
        }
        if (Array.isArray(row.sessions))
          (day.sessions ??= []).push(
            ...row.sessions.map(cleanSession).filter(Boolean),
          );
      }
    } catch {
      unreadableFiles++;
    }
  }
  return { days, unreadableFiles };
}
function atomicWrite(file, value) {
  const temporary = file + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
// Adds backup days this device does not have yet; existing days are never changed.
function restoreDays(root, backup) {
  if (
    !backup ||
    backup.version !== 1 ||
    !backup.days ||
    typeof backup.days !== "object"
  )
    return null;
  const existing = aggregate(root).days;
  const deleted = readDeleted(root);
  const days = Object.create(null);
  let skipped = 0;
  for (const [date, row] of Object.entries(backup.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !row || typeof row !== "object")
      continue;
    if (existing[date]) {
      skipped++;
      continue;
    }
    const day = sanitizeDay(row);
    if (day.seconds > 0 || day.edits > 0) days[date] = day;
  }
  const restored = Object.keys(days).length;
  // Restored days are shown again even if the user deleted them earlier.
  const reopened = Object.keys(days).filter((day) => deleted.delete(day));
  if (reopened.length) {
    writeDeleted(root, deleted);
    reopened.forEach((day) => stripDay(root, day));
  }
  if (restored) {
    // The content hash makes a repeated restore of the same file idempotent.
    const digest = crypto
      .createHash("sha256")
      .update(JSON.stringify(days))
      .digest("hex")
      .slice(0, 16);
    atomicWrite(path.join(root, `restore-${digest}.json`), {
      version: 1,
      days,
    });
  }
  return { restored, skipped };
}
module.exports = {
  emptyDay,
  aggregate,
  atomicWrite,
  positive,
  restoreDays,
  deleteDay,
};
