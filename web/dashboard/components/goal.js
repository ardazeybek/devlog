import { state } from "../state.js";
import { duration } from "../helpers.js";

export function goalCard({ today }) {
  const goalPercent = Math.min(
    100,
    Math.floor(((today.seconds || 0) / (state.goal * 60)) * 100),
  );
  const goal = /* HTML */ `<article class="card goal-card">
    <h2>Daily goal</h2>
    <div class="goal-ring" style="--progress:${goalPercent}%">
      <div>
        <strong>${goalPercent}<small>%</small></strong
        ><span>${duration(state.goal * 60)}</span>
      </div>
    </div>
    <div class="goal-caption">
      <strong>${duration(today.seconds)}</strong>
      <p>
        ${Math.max(0, state.goal - Math.floor((today.seconds || 0) / 60))}
        minutes remaining
      </p>
    </div>
  </article>`;

  return goal;
}
