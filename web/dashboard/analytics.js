// Pure date-range, summary, heatmap and export rules. No DOM or global state.
export const ACTIVE_SECONDS = 900;
const MAX_KEYS = 4000;

// Left-pads a number to two digits.
function pad(value) {
  return String(value).padStart(2, "0");
}

// Formats a Date as a local calendar key (YYYY-MM-DD).
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Parses a calendar key as a local date at noon, which avoids daylight-saving edges.
export function parseKey(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

// Returns a new Date shifted by whole calendar days.
export function shiftDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Lists calendar keys from start to end, inclusive.
export function keysBetween(start, end) {
  const keys = [];
  for (
    let day = parseKey(start);
    dateKey(day) <= end && keys.length < MAX_KEYS;
    day = shiftDays(day, 1)
  )
    keys.push(dateKey(day));
  return keys;
}

// Returns the keys selected by a preset or a custom start and end.
export function rangeKeys(range, today, firstKey) {
  const end = dateKey(today);
  if (range.preset === "custom")
    return range.start && range.end ? keysBetween(range.start, range.end) : [];
  if (range.preset === "year")
    return keysBetween(`${today.getFullYear()}-01-01`, end);
  if (range.preset === "all") return keysBetween(firstKey || end, end);
  return keysBetween(dateKey(shiftDays(today, 1 - Number(range.preset))), end);
}

// Describes a range for headings and report sentences.
export function rangeLabel(range) {
  const labels = {
    7: "Last 7 days",
    30: "Last 30 days",
    90: "Last 90 days",
    year: "This year",
    all: "All time",
  };
  return labels[range.preset] || `${range.start} to ${range.end}`;
}

// Formats seconds as hours and minutes.
export function duration(seconds) {
  const minutes = Math.floor((seconds || 0) / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// Adds numeric counters across the given day records.
export function sum(rows, counter) {
  return rows.reduce((total, row) => total + (row[counter] || 0), 0);
}

// Merges project or language counters and sorts them by time.
export function groups(rows, field) {
  const totals = Object.create(null);
  rows.forEach((row) =>
    Object.entries(row[field] || {}).forEach(
      ([name, value]) => (totals[name] = (totals[name] || 0) + value),
    ),
  );
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

// Summarizes the day records selected by a list of keys.
export function totalsFor(keys, days) {
  const rows = keys.map((day) => days[day] || {});
  return {
    seconds: sum(rows, "seconds"),
    activeDays: rows.filter((row) => (row.seconds || 0) >= ACTIVE_SECONDS)
      .length,
    added: sum(rows, "added"),
    removed: sum(rows, "removed"),
    bulk: sum(rows, "bulk"),
    projects: groups(rows, "projects"),
    languages: groups(rows, "languages").filter(
      ([name, value]) => name.toLowerCase() !== "plaintext" && value > 0,
    ),
  };
}

// Returns the current and previous periods of the same length: "week" or "month".
export function periodPair(kind, today) {
  if (kind === "week") {
    const elapsed = ((today.getDay() + 6) % 7) + 1;
    const monday = shiftDays(today, 1 - elapsed);
    const previousMonday = shiftDays(monday, -7);
    return {
      current: keysBetween(dateKey(monday), dateKey(today)),
      previous: keysBetween(
        dateKey(previousMonday),
        dateKey(shiftDays(previousMonday, elapsed - 1)),
      ),
    };
  }
  const elapsed = today.getDate();
  const first = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const previousFirst = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
    12,
  );
  const previousLength = new Date(
    today.getFullYear(),
    today.getMonth(),
    0,
  ).getDate();
  return {
    current: keysBetween(dateKey(first), dateKey(today)),
    previous: keysBetween(
      dateKey(previousFirst),
      dateKey(shiftDays(previousFirst, Math.min(elapsed, previousLength) - 1)),
    ),
  };
}

// Returns the percentage change, or null when there is no baseline.
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// Builds plain-language sentences that compare two periods.
export function describePeriods({
  label,
  previousLabel,
  current,
  previous,
  languageName = (id) => id,
}) {
  const lines = [
    `${label}: ${duration(current.seconds)} of active coding on ${current.activeDays} active ${current.activeDays === 1 ? "day" : "days"}.`,
  ];
  const change = percentChange(current.seconds, previous.seconds);
  if (change === null)
    lines.push(`There was no activity in ${previousLabel} to compare with.`);
  else if (change === 0) lines.push(`That is the same as ${previousLabel}.`);
  else
    lines.push(
      `That is ${Math.abs(change)}% ${change > 0 ? "more" : "less"} than ${previousLabel} (${duration(previous.seconds)}).`,
    );
  if (current.projects.length) {
    const [name, seconds] = current.projects[0];
    const share = Math.round((seconds / Math.max(1, current.seconds)) * 100);
    lines.push(`Most time went to ${name} (${share}%).`);
  }
  if (current.languages.length)
    lines.push(
      `Your main language was ${languageName(current.languages[0][0])}.`,
    );
  return lines;
}

// Maps a day's active seconds to a heatmap level from 0 to 4, relative to the daily goal.
export function heatLevel(seconds, goalMinutes) {
  if (!seconds) return 0;
  const ratio = seconds / (Math.max(1, goalMinutes) * 60);
  if (ratio >= 1) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

// Returns the per-day seconds of one project across the keys.
export function projectSeries(keys, days, project) {
  return keys.map((day) =>
    Object.hasOwn(days[day]?.projects || {}, project)
      ? days[day].projects[project]
      : 0,
  );
}

// Quotes a CSV cell only when needed.
function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Builds a long-format CSV with one row per day and project.
export function projectCsv(keys, days) {
  const lines = ["date,project,seconds"];
  for (const day of keys)
    for (const [project, seconds] of groups([days[day] || {}], "projects"))
      lines.push([day, project, Math.round(seconds)].map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

// Builds a version-1 backup document that the restore route accepts.
export function backupDocument(days, exportedAt = new Date()) {
  const copy = {};
  for (const [day, row] of Object.entries(days))
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) copy[day] = row;
  return { version: 1, exportedAt: exportedAt.toISOString(), days: copy };
}

// Renames projects through an alias map, merging their time into the new name.
export function remapProjects(days, aliases = {}) {
  const remapped = {};
  for (const [day, row] of Object.entries(days)) {
    const projects = {};
    for (const [name, seconds] of Object.entries(row.projects || {})) {
      const target = Object.hasOwn(aliases, name) ? aliases[name] : name;
      projects[target] = (projects[target] || 0) + seconds;
    }
    remapped[day] = { ...row, projects };
  }
  return remapped;
}

// Sums project totals into the user's groups; unlisted projects stay under their own name.
export function groupTotals(projects, groups = {}) {
  const owner = {};
  for (const [group, names] of Object.entries(groups))
    if (Array.isArray(names)) for (const name of names) owner[name] = group;
  const totals = Object.create(null);
  for (const [name, seconds] of projects) {
    const label = owner[name] || name;
    totals[label] = (totals[label] || 0) + seconds;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

// Separator between a project and its branch in stored branch keys.
export const BRANCH_SEPARATOR = "\u001f";

// Lists time per project and branch across the keys, longest first.
export function branchRows(keys, days) {
  const rows = groups(
    keys.map((day) => days[day] || {}),
    "branches",
  );
  return rows.map(([key, seconds]) => {
    const [project, branch] = key.split(BRANCH_SEPARATOR);
    return { project, branch: branch || "unknown", seconds };
  });
}

// Lists the day's coding sessions as readable time ranges.
export function sessionRows(record = {}) {
  return (record.sessions || []).map((item) => ({
    ...item,
    from: clock(item.start),
    to: clock(item.end),
  }));
}

// Formats minutes since midnight as HH:MM.
function clock(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// Describes why tracking is or is not counting right now.
export function statusMessage(status) {
  const messages = {
    counting: "",
    paused: "Tracking is paused. Resume it in VS Code.",
    unfocused: "VS Code is in the background, so time is not counted.",
    idle: "No recent edits, so time is not counted.",
    excluded: "This project is excluded from tracking.",
    waiting: "",
  };
  return messages[status] || "";
}

// Colors used to tell projects and languages apart; the first entry is the brand teal.
const SWATCHES = [
  "#0f6e74",
  "#d97706",
  "#7c5cbf",
  "#2f80c2",
  "#c2456b",
  "#4f9d47",
  "#8a6d3b",
  "#5c6f7d",
];

// Returns a stable swatch for a name, so the same project keeps its color everywhere.
export function colorFor(name) {
  let hash = 0;
  for (const char of String(name))
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SWATCHES[hash % SWATCHES.length];
}

// Counts days in the last n keys that reached the daily goal.
export function goalHitRate(days, goalMinutes, keys) {
  const hit = keys.filter(
    (day) => (days[day]?.seconds || 0) >= goalMinutes * 60,
  ).length;
  return {
    hit,
    total: keys.length,
    percent: keys.length ? Math.round((hit / keys.length) * 100) : 0,
  };
}
