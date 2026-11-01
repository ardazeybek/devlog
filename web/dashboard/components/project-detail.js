// Detail card for one project: totals, working days and a per-day trend.
import { esc, duration } from "../helpers.js";
import { projectSeries, colorFor } from "../analytics.js";

// Builds the bar trend for a project across the selected keys.
function trendBars(values, color) {
  const max = Math.max(1, ...values);
  const width = 760 / Math.max(1, values.length);
  return values
    .map(
      (value, i) =>
        /* HTML */ `<rect
          style="fill:${color}"
          x="${(i * width + width * 0.15).toFixed(2)}"
          y="${(200 - (value / max) * 180).toFixed(2)}"
          width="${(width * 0.7).toFixed(2)}"
          height="${((value / max) * 180).toFixed(2)}"
          rx="2"
          ><title>${duration(value)}</title></rect
        >`,
    )
    .join("");
}

// Builds the detail card for a project within the selected keys.
export function projectDetail({ name, keys, days, total }) {
  const values = projectSeries(keys, days, name);
  const seconds = values.reduce((sum, value) => sum + value, 0);
  const activeKeys = keys.filter((_, i) => values[i] > 0);
  const share = Math.round((seconds / Math.max(1, total)) * 100);
  return /* HTML */ `<article class="card project-detail">
    <h2>${esc(name)}</h2>
    <div class="detail-stats">
      <div>
        <span class="muted">Active time</span><b>${duration(seconds)}</b>
      </div>
      <div><span class="muted">Share of range</span><b>${share}%</b></div>
      <div>
        <span class="muted">Working days</span><b>${activeKeys.length}</b>
      </div>
      <div>
        <span class="muted">First and last</span>
        <b
          >${activeKeys.length ? `${activeKeys[0]} · ${activeKeys.at(-1)}` : "None"}</b
        >
      </div>
    </div>
    <svg
      class="trend"
      viewBox="0 0 760 200"
      role="img"
      aria-label="${esc(name)} daily time"
    >
      ${trendBars(values, colorFor(name))}
    </svg>
  </article>`;
}
