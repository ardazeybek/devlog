import { duration, number, sum } from "../helpers.js";
import { badges } from "./awards.js";
import { chart } from "../components/chart.js";

export function overviewPage({ keys, total, language, goal }) {
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
    </section>`;
}
export function statisticsPage({ keys, language, ds }) {
  return /* HTML */ `<section class="grid">
      <article class="card">
        <h2>Daily activity</h2>
        ${chart(keys)}
      </article>
      ${language}
    </section>
    <section class="metrics">
      <div class="metric">
        <span class="muted">Lines added</span><b>${number(sum(ds, "added"))}</b>
      </div>
      <div class="metric">
        <span class="muted">Lines removed</span
        ><b>${number(sum(ds, "removed"))}</b>
      </div>
      <div class="metric">
        <span class="muted">Pasted characters</span
        ><b>${number(sum(ds, "bulk"))}</b>
      </div>
    </section>`;
}
