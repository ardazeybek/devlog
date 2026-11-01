"use strict";
// Builds the Sunday-evening weekly summary text and decides when it is due.
const { dayKey } = require("../tracking/rules");
const ACTIVE_SECONDS = 900;
const DUE_HOUR = 18;

// Returns the key of the Monday that starts the week containing a date.
function weekStartKey(now) {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dayKey(monday);
}

// Lists the keys from this week's Monday through the given day.
function weekKeysUntil(now) {
  const keys = [];
  const day = new Date(now);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  while (dayKey(day) <= dayKey(now)) {
    keys.push(dayKey(day));
    day.setDate(day.getDate() + 1);
  }
  return keys;
}

// Summarizes this week's time and returns the notification text.
function summarizeWeek(days, now) {
  const rows = weekKeysUntil(now).map((key) => days[key] || {});
  const seconds = rows.reduce((total, row) => total + (row.seconds || 0), 0);
  const activeDays = rows.filter(
    (row) => (row.seconds || 0) >= ACTIVE_SECONDS,
  ).length;
  const projects = {};
  for (const row of rows)
    for (const [name, value] of Object.entries(row.projects || {}))
      projects[name] = (projects[name] || 0) + value;
  const top = Object.entries(projects).sort((a, b) => b[1] - a[1])[0];
  const minutes = Math.floor(seconds / 60);
  const hours = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const activeText = `${activeDays} active ${activeDays === 1 ? "day" : "days"}`;
  return top
    ? `This week: ${hours} across ${activeText}. Most time went to ${top[0]}.`
    : `This week: ${hours} across ${activeText}.`;
}

// Tells whether this week's summary should be shown now and was not shown yet.
function isSummaryDue(now, lastSentKey) {
  return (
    now.getDay() === 0 &&
    now.getHours() >= DUE_HOUR &&
    lastSentKey !== weekStartKey(now)
  );
}
module.exports = { summarizeWeek, isSummaryDue, weekStartKey };
