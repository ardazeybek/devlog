// Rendering preserves page scroll, the title catalog scroll and the selected range.
import { metricsCard } from "./components/metrics.js";
import { languageCard } from "./components/language.js";
import { goalCard, weeklyGoalCard } from "./components/goal.js";
import { tableCard } from "./components/table.js";
import { projectDetail } from "./components/project-detail.js";
import { branchCard, groupsCard } from "./components/branches.js";
import { current, state, token } from "./state.js";
import { $, key } from "./helpers.js";
import {
  dateKey,
  goalHitRate,
  periodPair,
  rangeKeys,
  rangeLabel,
  branchRows,
  groupTotals,
  shiftDays,
  totalsFor,
} from "./analytics.js";
import { awardsPage, bindAwards } from "./pages/awards.js";
import { settingsPage, bindSettings } from "./pages/settings.js";
import { overviewPage, statisticsPage } from "./pages/activity.js";
import { reportsPage, bindReports } from "./pages/reports.js";
let renderedTab = null,
  selectedProject = null,
  selectedDay = null;
const TITLES = {
  overview: "Overview",
  stats: "Statistics",
  awards: "Achievements",
  projects: "Projects",
  reports: "Reports",
  settings: "Settings",
};

// Reads the range controls; an empty custom range defaults to the last 30 days.
function readRange(today) {
  const preset = $("#period")?.value || "7",
    start = $("#range-start"),
    end = $("#range-end");
  if (preset === "custom" && start && end && !start.value) {
    start.value = dateKey(shiftDays(today, -29));
    end.value = dateKey(today);
  }
  return { preset, start: start?.value || "", end: end?.value || "" };
}

// Shows a hint when a custom range has its dates reversed.
function updateRangeNote(range) {
  const note = $("#range-note");
  const custom = range.preset === "custom";
  if (note)
    note.textContent =
      custom && range.start > range.end
        ? "The start date must be before the end date."
        : "";
  const wrap = $("#range-custom");
  if (wrap) wrap.hidden = !custom;
}

// Builds grouped project rows as [group, member list, seconds].
function groupRows(projects) {
  const config = state.projectGroups || {};
  return groupTotals(projects, config).map(([name, seconds]) => [
    name,
    Array.isArray(config[name]) ? config[name].join(", ") : "",
    seconds,
  ]);
}

// Returns the page body for the current tab.
function pageBody({ today, keys, totals, metrics, language, goal, ds }) {
  if (current === "settings") return settingsPage();
  let body = metrics;
  const { projects, seconds: total } = totals;
  if (current === "overview") {
    const week = totalsFor(periodPair("week", today).current, state.days);
    body += overviewPage({
      keys,
      total,
      language,
      goal,
      weekly: weeklyGoalCard({ seconds: week.seconds }),
    });
  }
  if (current === "stats")
    body += statisticsPage({ today, keys, language, selectedDay });
  if (current === "awards") body += awardsPage();
  if (current === "projects") {
    body += tableCard({ projects, total });
    body += groupsCard(groupRows(projects), total);
    body += branchCard(branchRows(keys, state.days));
    if (selectedProject)
      body += projectDetail({
        name: selectedProject,
        keys,
        days: state.days,
        total,
      });
  }
  if (current === "reports") body += reportsPage({ today, projects });
  return body;
}

// Connects handlers for the rendered tab: table rows, heatmap cells and reports.
function bindTab(keys, today) {
  document.querySelectorAll("[data-project]").forEach(
    (button) =>
      (button.onclick = () => {
        selectedProject = button.dataset.project;
        render();
      }),
  );
  document.querySelectorAll("[data-day]").forEach(
    (cell) =>
      (cell.onclick = () => {
        selectedDay = cell.dataset.day;
        render();
      }),
  );
  if (current === "reports") bindReports({ keys, today, onChange: render });
  if (current === "stats") bindDayDelete();
}

// Connects the delete button in the day detail; past days only, after confirmation.
function bindDayDelete() {
  document.querySelectorAll("[data-delete-day]").forEach(
    (button) =>
      (button.onclick = async () => {
        const day = button.dataset.deleteDay;
        if (
          !globalThis.confirm?.(
            `Delete the saved record for ${day}? Restore a backup to bring it back.`,
          )
        )
          return;
        try {
          const r = await fetch("/api/days/delete", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ date: day }),
          });
          if (!r.ok) return;
        } catch {
          return;
        }
        delete state.days[day];
        selectedDay = null;
        render();
      }),
  );
}

// Renders the active tab with the range and handlers that belong to it.
function render(mode = "") {
  const entering = renderedTab !== current;
  globalThis.DevlogMotion?.beforeRender();
  const preserve = renderedTab === current,
    scroll = preserve
      ? {
          x: window.scrollX,
          y: window.scrollY,
          titles: $(".title-catalog")?.scrollTop || 0,
        }
      : null;
  const today = new Date(),
    range = readRange(today);
  updateRangeNote(range);
  const keys = rangeKeys(range, today, Object.keys(state.days).sort()[0]),
    ds = keys.map((k) => state.days[k] || {}),
    todayRecord = state.days[key(today)] || {},
    totals = totalsFor(keys, state.days),
    language = languageCard({ langs: totals.languages, total: totals.seconds });
  $("#title").textContent = TITLES[current];
  document
    .querySelectorAll("nav button")
    .forEach(
      (b) => (
        b.classList.toggle("selected", b.dataset.tab === current),
        b.setAttribute(
          "aria-current",
          b.dataset.tab === current ? "page" : "false",
        )
      ),
    );

  const goalPercent = Math.min(
    100,
    Math.floor(((todayRecord.seconds || 0) / (state.goal * 60)) * 100),
  );
  const metrics = metricsCard({
    today: todayRecord,
    label: rangeLabel(range),
    total: totals.seconds,
    ds,
    goalPercent,
  });
  const hits = goalHitRate(
    state.days,
    state.goal,
    rangeKeys({ preset: "30" }, today),
  );
  const goal = goalCard({ today: todayRecord, hits });
  const periodSelect = $("#period");
  (periodSelect?.closest?.(".glass-select") || periodSelect || {}).hidden =
    current === "settings";
  $("#content").innerHTML = pageBody({
    today,
    keys,
    totals,
    metrics,
    language,
    goal,
    ds,
  });
  bindAwards(render);
  bindSettings();
  bindTab(keys, today);
  if (scroll) {
    const catalog = $(".title-catalog");
    if (catalog) catalog.scrollTop = scroll.titles;
    window.scrollTo(scroll.x, scroll.y);
  }
  renderedTab = current;
  globalThis.DevlogControls?.enhanceAll();
  globalThis.DevlogMotion?.afterRender({
    page: entering,
    chart: mode === "period",
  });
}

export { render, renderedTab };
