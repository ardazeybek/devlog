// Browser entry: fetch API snapshots, handle navigation and schedule refreshes.
import { current, state, token, setCurrent, setState } from "./state.js";
import { $ } from "./helpers.js";
import { remapProjects, statusMessage } from "./analytics.js";
import { render, renderedTab } from "./render.js";
import { enhanceDateInputs } from "./ui/date-wheel.js";
enhanceDateInputs();
function showIssue(message = "") {
  const el = $("#notice");
  el.textContent = message ? "⚠ " + message : "";
  el.hidden = !message;
}
let refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const r = await fetch("/api/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Devlog-Visible": document.hidden ? "0" : "1",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw Object.assign(Error(), { status: r.status });
    const nextState = await r.json();
    nextState.days = remapProjects(nextState.days, nextState.projectAliases);
    const changed = JSON.stringify(state) !== JSON.stringify(nextState);
    setState(nextState);
    globalThis.DevlogCelebrations?.receive(state.rewardEvents || []);
    showIssue(
      state.issue === "STORAGE_WRITE_FAILED"
        ? "devlog could not save your time. Check your free disk space."
        : state.issue === "PARTIAL_DATA"
          ? "Some saved activity could not be loaded."
          : statusMessage(state.trackingStatus),
    );
    if (
      (changed || renderedTab === null) &&
      current !== "settings" &&
      !document.activeElement?.closest(".award-tools")
    )
      render();
  } catch (e) {
    showIssue(
      e.status === 401
        ? "This page has expired. Open devlog again from VS Code."
        : e.status === 500
          ? "devlog could not load your saved activity."
          : "devlog is disconnected. Open it again from VS Code.",
    );
    if (renderedTab === null) render();
  } finally {
    refreshing = false;
  }
}
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      setCurrent(b.dataset.tab);
      render();
    }),
);
for (const id of ["#period", "#range-start", "#range-end"])
  $(id).onchange = () => render("period");
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh();
  else
    fetch("/api/stats", {
      headers: { Authorization: `Bearer ${token}`, "X-Devlog-Visible": "0" },
      keepalive: true,
    }).catch(() => {});
});
refresh();
setInterval(refresh, 10000);

export { refresh };
