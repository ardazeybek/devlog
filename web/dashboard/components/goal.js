// Daily and weekly goal cards with a progress ring.
import { state } from "../state.js";
import { duration } from "../helpers.js";

// Builds a progress card for a goal that is measured in minutes.
function goalProgress({ title, seconds, goalMinutes, unit, footer = "" }) {
  const raw = Math.floor((seconds / (goalMinutes * 60)) * 100);
  const percent = Math.min(100, raw);
  const remaining = Math.max(0, goalMinutes - Math.floor(seconds / 60));
  return /* HTML */ `<article
    class="card goal-card${raw >= 100 ? " is-complete" : ""}"
  >
    <h2>${title}</h2>
    <div class="goal-ring" style="--progress:${percent}%">
      <div>
        <strong>${percent}<small>%</small></strong
        ><span>${duration(goalMinutes * 60)}</span>
      </div>
    </div>
    <div class="goal-caption">
      <strong>${duration(seconds)}</strong>
      <p>${remaining} minutes remaining${unit ? ` ${unit}` : ""}</p>
      ${footer ? `<p class="goal-footer">${footer}</p>` : ""}
    </div>
  </article>`;
}

// Builds the daily goal card from today's record.
export function goalCard({ today, hits }) {
  return goalProgress({
    title: "Daily goal",
    seconds: today.seconds || 0,
    goalMinutes: state.goal,
    footer: hits
      ? `Reached on ${hits.hit} of the last ${hits.total} days (${hits.percent}%).`
      : "",
  });
}

// Builds the weekly goal card from this calendar week's total.
export function weeklyGoalCard({ seconds }) {
  return goalProgress({
    title: "Weekly goal",
    seconds,
    goalMinutes: state.weeklyGoal,
    unit: "this week",
  });
}
