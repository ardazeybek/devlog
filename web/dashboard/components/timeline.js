// Day timeline: a 24-hour bar and the list of coding sessions.
import { esc, duration } from "../helpers.js";
import { sessionRows } from "../analytics.js";

// Builds the timeline for one day record.
export function timeline(record) {
  const rows = sessionRows(record);
  if (!rows.length)
    return '<p class="muted">No coding sessions were recorded.</p>';
  const bars = rows
    .map(
      (row) =>
        `<i style="left:${((row.start / 1440) * 100).toFixed(2)}%;width:${(Math.max(1, row.end - row.start) / 14.4).toFixed(2)}%" title="${esc(row.project)}"></i>`,
    )
    .join("");
  const list = rows
    .map(
      (row) =>
        `<li><b>${row.from}–${row.to}</b> ${esc(row.project)} <span class="muted">${esc(row.language)}</span></li>`,
    )
    .join("");
  return `<div class="timeline-bar" aria-hidden="true">${bars}</div><ul class="timeline-list">${list}</ul><p class="muted">${rows.length} ${rows.length === 1 ? "session" : "sessions"} · ${duration(record.seconds)} counted</p>`;
}
