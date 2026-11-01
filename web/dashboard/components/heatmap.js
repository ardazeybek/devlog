// Year heatmap: one cell per day, colored by share of the daily goal.
import { heatLevel, dateKey, keysBetween } from "../analytics.js";
import { state } from "../state.js";

// Builds the last 365 days as weekly columns of day buttons.
export function heatmap(today, goalMinutes) {
  const end = dateKey(today);
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const keys = keysBetween(dateKey(start), end);
  const offset = (new Date(keys[0] + "T12:00:00").getDay() + 6) % 7;
  const cells = Array.from({ length: offset }, () => "");
  for (const day of keys) {
    const seconds = state.days[day]?.seconds || 0;
    const level = heatLevel(seconds, goalMinutes);
    cells.push(
      /* HTML */ `<button
        type="button"
        class="heat-cell level-${level}"
        data-day="${day}"
        aria-label="${day}: ${Math.round(seconds / 60)} minutes"
      ></button>`,
    );
  }
  return /* HTML */ `<div
      class="heatmap"
      role="group"
      aria-label="Activity over the last year"
    >
      ${cells.join("")}
    </div>
    <div class="heat-legend muted">
      Less <i class="heat-cell level-0"></i><i class="heat-cell level-1"></i
      ><i class="heat-cell level-2"></i><i class="heat-cell level-3"></i
      ><i class="heat-cell level-4"></i> More
    </div>`;
}
