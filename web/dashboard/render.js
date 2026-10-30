import { metricsCard } from "./components/metrics.js";
import { languageCard } from "./components/language.js";
import { goalCard } from "./components/goal.js";
import { tableCard } from "./components/table.js";
// Rendering preserves both page scroll and the independently scrolling title catalog.
import { current, state } from "./state.js";
import { $, key, dates, sum, groups } from "./helpers.js";
import { awardsPage, bindAwards } from "./pages/awards.js";
import { settingsPage, bindSettings } from "./pages/settings.js";
import { overviewPage, statisticsPage } from "./pages/activity.js";
let renderedTab = null;
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
  const n = Number($("#period").value),
    keys = dates(n),
    ds = keys.map((k) => state.days[k] || {}),
    today = state.days[key(new Date())] || {},
    total = sum(ds, "seconds"),
    langs = groups(ds, "languages").filter(
      ([l, v]) => l.toLowerCase() !== "plaintext" && v > 0,
    ),
    projects = groups(ds, "projects");
  $("#title").textContent = {
    overview: "Overview",
    stats: "Statistics",
    awards: "Achievements",
    projects: "Projects",
    settings: "Settings",
  }[current];
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

  const metrics = metricsCard({ today, n, total, ds });
  const language = languageCard({ langs, total });
  const goal = goalCard({ today });
  const table = tableCard({ projects, total });
  const range = $("#period");
  (range.closest?.(".glass-select") || range).hidden = current === "settings";
  let body = current === "settings" ? settingsPage() : metrics;
  if (current === "overview")
    body += overviewPage({ keys, total, language, goal });
  if (current === "stats") body += statisticsPage({ keys, language, ds });
  if (current === "awards") body += awardsPage();
  if (current === "projects") body += table;
  $("#content").innerHTML = body;
  bindAwards(render);
  bindSettings();
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
