// Overview and statistics page composition for the selected range.
import { duration, number, esc } from "../helpers.js";
import { timeline } from "../components/timeline.js";
import { badges } from "./awards.js";
import { chart } from "../components/chart.js";
import { heatmap } from "../components/heatmap.js";
import { state } from "../state.js";
import { dateKey } from "../analytics.js";

// Builds the overview cards, including the weekly goal.
export function overviewPage({ keys, total, language, goal, weekly }) {
  return /* HTML */ `<section class="grid">
      <article class="card">
        <h2>Active coding time</h2>
        <p>Total ${duration(total)}</p>
        ${chart(keys)}
      </article>
      ${language}
    </section>
    <section class="grid">
      <article class="card">
        <h2>Next achievements</h2>
        <div class="badges">${badges()}</div>
      </article>
      ${goal}
    </section>
    <section class="grid">${weekly}</section>`;
}

// Builds the statistics cards, the year heatmap and the selected day detail.
export function statisticsPage({ today, keys, language, selectedDay }) {
  return /* HTML */ `<section class="grid">
      <article class="card">
        <h2>Daily activity</h2>
        ${chart(keys)}
      </article>
      ${language}
    </section>
    <article class="card">
      <h2>Last 365 days</h2>
      ${heatmap(today, state.goal)}
      <div class="day-detail" id="day-detail" aria-live="polite">
        ${selectedDay ? dayDetail(selectedDay, dateKey(today)) : '<p class="muted">Select a day to see its details.</p>'}
      </div>
    </article>`;
}

// Builds the details of one day from the heatmap.
function dayDetail(day, today) {
  const record = state.days[day] || {};
  const canDelete = day < today;
  const projects = Object.entries(record.projects || {}).sort(
    (a, b) => b[1] - a[1],
  );
  return /* HTML */ `<h3>${esc(day)}</h3>
    <p>
      ${duration(record.seconds)} active · ${number(record.typed)} typed
      characters
    </p>
    <p class="muted">
      ${projects.length ? projects.map(([name, seconds]) => `${esc(name)} (${duration(seconds)})`).join(", ") : "No projects recorded."}
    </p>
    ${timeline(record)}${canDelete ? `<button type="button" class="link-button danger" data-delete-day="${esc(day)}">Delete this day's record</button>` : ""}`;
}
