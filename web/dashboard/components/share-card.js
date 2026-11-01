// Builds an SVG share card for a period summary; project names are optional.
import { esc, duration } from "../helpers.js";

// Returns an SVG document summarizing one period.
export function shareCard({ title, totals, showProjects }) {
  const top = showProjects ? totals.projects.slice(0, 3) : [];
  const rows = top.length
    ? top
        .map(
          ([name, seconds], i) =>
            `<text x="60" y="${330 + i * 44}" class="row">${esc(name)}</text><text x="740" y="${330 + i * 44}" text-anchor="end" class="row">${duration(seconds)}</text>`,
        )
        .join("")
    : `<text x="60" y="330" class="row">Project names are hidden.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
  <style>
    .title{font:600 26px system-ui,sans-serif;fill:#1d3b30}
    .big{font:700 72px system-ui,sans-serif;fill:#14956b}
    .muted{font:400 18px system-ui,sans-serif;fill:#577466}
    .row{font:500 22px system-ui,sans-serif;fill:#1d3b30}
  </style>
  <rect width="800" height="480" rx="32" fill="#f4faf7"/>
  <text x="60" y="78" class="title">devlog · ${esc(title)}</text>
  <text x="60" y="180" class="big">${esc(duration(totals.seconds))}</text>
  <text x="60" y="222" class="muted">${totals.activeDays} active ${totals.activeDays === 1 ? "day" : "days"}</text>
  <line x1="60" x2="740" y1="262" y2="262" stroke="#d0ddd6"/>
  ${rows}
</svg>`;
}
