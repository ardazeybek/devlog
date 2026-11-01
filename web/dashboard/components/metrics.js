// Summary metric cards for the selected range, today and the coding streak.
import { duration, streak, flame } from "../helpers.js";

// Builds the three top-level metric cards for the selected range.
export function metricsCard({ today, label, total, ds, goalPercent = 0 }) {
  const activeDays = ds.filter((d) => d.seconds >= 900).length;
  const metrics = /* HTML */ `<section class="metrics">
    <div class="metric metric-today">
      <span class="metric-label">Today<span class="metric-icon">◷</span></span
      ><b data-count="${today.seconds || 0}" data-format="duration"
        >${duration(today.seconds)}</b
      >
      <div class="today-progress" aria-label="${goalPercent}% of daily goal">
        <i style="width:${goalPercent}%"></i>
      </div>
    </div>
    <div class="metric">
      <span class="metric-label"
        >${label}<span class="metric-icon">↗</span></span
      ><b data-count="${total}" data-format="duration">${duration(total)}</b
      ><span class="muted"
        >${activeDays} active ${activeDays === 1 ? "day" : "days"}</span
      >
    </div>
    <div class="metric metric-streak">
      <span class="metric-label"
        >Coding streak<span class="metric-icon"
          ><svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M13 3c3 6-3 7-1 11 2-1 3-3 3-5 4 4 5 7 3 10-2 4-9 4-12 0-2-4 0-7 3-10 0 3 1 5 2 5-1-5 2-6 2-11Z"
            /></svg></span></span
      ><b data-count="${streak()}" data-format="days"
        >${streak()} ${streak() === 1 ? "day" : "days"}</b
      >
      <div class="streak-flames" aria-label="${streak()}-day streak">
        ${Array.from({ length: 7 }, (_, i) => flame(i < Math.min(streak(), 7))).join("")}
      </div>
    </div>
  </section>`;

  return metrics;
}
