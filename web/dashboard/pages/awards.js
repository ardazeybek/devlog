import { current, state } from "../state.js";
import { $, esc, bar, number } from "../helpers.js";
let awardGroup = "All",
  awardStatus = "all",
  awardQuery = "";
const achievements = () => DevlogAchievements.evaluate(state.days);
function awardCard(a) {
  return /* HTML */ `<div class="award ${a.earned ? "earned" : ""}">
    <div class="award-top">
      <span class="award-icon">${a.earned ? "✦" : "◇"}</span
      ><span class="pill"
        >${a.earned ? "Earned" : a.group} · ${a.points} XP</span
      >
    </div>
    <strong>${esc(a.name)}</strong>
    <p>${esc(a.description)}</p>
    ${bar(a.value, a.target)}
    <div class="award-bottom">
      <span>${number(Math.min(a.value, a.target))} / ${number(a.target)}</span
      ><span>${Math.min(100, Math.floor((a.value / a.target) * 100))}%</span>
    </div>
  </div>`;
}
function badges() {
  const next = achievements()
    .filter((a) => !a.earned)
    .sort((a, b) => b.value / b.target - a.value / a.target)
    .slice(0, 3);
  return next.map(awardCard).join("") || "<p>All achievements completed.</p>";
}
function awardsPage() {
  const list = achievements(),
    earned = list.filter((a) => a.earned),
    progress = DevlogAchievements.titles(state.days),
    xp = progress.xp,
    rank = progress.current,
    next = progress.next;
  const filtered = list.filter(
    (a) =>
      (awardGroup === "All" || a.group === awardGroup) &&
      (awardStatus === "all" || (awardStatus === "earned") === a.earned) &&
      (!awardQuery ||
        (a.name + " " + a.description)
          .toLocaleLowerCase("en-US")
          .includes(awardQuery.toLocaleLowerCase("en-US"))),
  );
  return /* HTML */ `<article class="card reward-summary">
      <h2>${earned.length} / ${list.length} achievements</h2>
      <p>
        ${number(xp)} XP ·
        ${esc(rank.name)}${next ? " · Next: " + esc(next.name) : ""}
      </p>
      ${bar(earned.length, list.length)}
    </article>
    ${titlesPage(progress)}
    <article class="card">
      <div class="award-tools">
        <input
          id="award-search"
          aria-label="Search achievements"
          placeholder="Search achievements or languages…"
          value="${esc(awardQuery)}"
        /><select id="award-group" aria-label="Achievement category">
          ${["All", ...new Set(list.map((a) => a.group))].map((g) => /* HTML */ `<option ${g === awardGroup ? "selected" : ""}>${g}</option>`).join("")}</select
        ><select id="award-status" aria-label="Achievement status">
          <option value="all" ${awardStatus === "all" ? "selected" : ""}>
            All statuses
          </option>
          <option value="earned" ${awardStatus === "earned" ? "selected" : ""}>
            Earned
          </option>
          <option value="locked" ${awardStatus === "locked" ? "selected" : ""}>
            In progress
          </option>
        </select>
      </div>
      <div class="award-catalog">
        ${filtered.map(awardCard).join("") || "<p>No matching achievements.</p>"}
      </div>
    </article>`;
}
function titlesPage(progress) {
  return /* HTML */ `<article class="card title-section">
    <h2>Titles</h2>
    <div class="title-catalog">
      ${progress.titles
        .map(
          (t) =>
            /* HTML */ `<div class="title-card ${t.earned ? "earned" : ""}">
              <div class="award-top">
                <span class="award-icon">${t.earned ? "✦" : "◇"}</span
                >${t.earned ? '<span class="pill">Earned</span>' : ""}
              </div>
              <strong>${esc(t.name)}</strong>
              <ul>
                ${t.checks
                  .map(
                    (c, i) =>
                      /* HTML */ `<li class="${c.done ? "done" : ""}">
                        <span>${c.done ? "✓" : "○"}</span>
                        <div>
                          ${esc(c.label)}<small
                            >${number(Math.min(c.value, c.target))} /
                            ${number(c.target)}</small
                          >
                        </div>
                      </li>`,
                  )
                  .join("")}
              </ul>
            </div>`,
        )
        .join("")}
    </div>
  </article>`;
}
function bindAwards(render) {
  if (current !== "awards") return;
  $("#award-group").onchange = (e) => {
    awardGroup = e.target.value;
    render();
  };
  $("#award-status").onchange = (e) => {
    awardStatus = e.target.value;
    render();
  };
  $("#award-search").oninput = (e) => {
    const pos = e.target.selectionStart;
    awardQuery = e.target.value;
    render();
    $("#award-search").focus();
    $("#award-search").setSelectionRange(pos, pos);
  };
}

export { badges, awardsPage, bindAwards };
