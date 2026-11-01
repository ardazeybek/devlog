// Weekly and monthly reports, period comparison, exports and share cards.
import { $, esc } from "../helpers.js";
import { state, token } from "../state.js";
import {
  dateKey,
  describePeriods,
  periodPair,
  projectCsv,
  totalsFor,
  backupDocument,
} from "../analytics.js";
import { shareCard } from "../components/share-card.js";
import { journalCard } from "../components/journal.js";

// Builds one report card comparing the current period with the previous one.
function reportCard({ title, label, previousLabel, pair }) {
  const current = totalsFor(pair.current, state.days);
  const previous = totalsFor(pair.previous, state.days);
  const lines = describePeriods({
    label,
    previousLabel,
    current,
    previous,
    languageName: (id) => DevlogLanguages.name(id),
  });
  return {
    html: /* HTML */ `<article class="card report-card">
      <h2>${title}</h2>
      <ul class="report-lines">
        ${lines.map((line) => `<li>${esc(line)}</li>`).join("")}
      </ul>
    </article>`,
  };
}

// Builds the reports page, including exports and the share-card option.
export function reportsPage({ today, projects }) {
  const week = reportCard({
    title: "This week",
    label: "This week so far",
    previousLabel: "the same days last week",
    pair: periodPair("week", today),
  });
  const month = reportCard({
    title: "This month",
    label: "This month so far",
    previousLabel: "the same days last month",
    pair: periodPair("month", today),
  });
  return /* HTML */ `<section class="grid">${week.html} ${month.html}</section>
    <section class="grid">
      <article class="card">
        <h2>Share this week</h2>
        <p class="muted">Creates an SVG card with your weekly total.</p>
        <label class="check"
          ><input id="share-hide-projects" type="checkbox" checked /> Hide
          project names</label
        >
        <div class="actions">
          <button class="primary" type="button" id="share-card">
            Download week card
          </button>
          <button type="button" id="share-month">Download month card</button>
        </div>
      </article>
      <article class="card">
        <h2>Export the selected range</h2>
        <p class="muted">
          CSV lists time per day and project. JSON uses the backup format.
        </p>
        <div class="actions">
          <button type="button" id="print-report">Print or save PDF</button>
          <button type="button" id="export-csv">Export CSV</button>
          <button type="button" id="export-json">Export JSON</button>
        </div>
      </article>
      ${journalCard({ notes: state.journal || [], projects, today: dateKey(today) })}
    </section>`;
}

// Saves text as a file through a temporary object URL.
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Connects export and share actions to the selected keys and today's week.
export function bindReports({ keys, today, onChange }) {
  bindJournal(onChange);
  const stamp = dateKey(today);
  $("#export-csv")?.addEventListener("click", () =>
    download(`devlog-${stamp}.csv`, projectCsv(keys, state.days), "text/csv"),
  );
  $("#export-json")?.addEventListener("click", () =>
    download(
      `devlog-${stamp}.json`,
      JSON.stringify(backupDocument(pick(keys), today), null, 2),
      "application/json",
    ),
  );
  $("#print-report")?.addEventListener("click", () => window.print());
  $("#share-month")?.addEventListener("click", () => {
    const pair = periodPair("month", today);
    const svg = shareCard({
      title: "This month",
      totals: totalsFor(pair.current, state.days),
      showProjects: !$("#share-hide-projects")?.checked,
    });
    download(`devlog-month-${stamp}.svg`, svg, "image/svg+xml");
  });
  $("#share-card")?.addEventListener("click", () => {
    const pair = periodPair("week", today);
    const svg = shareCard({
      title: "This week",
      totals: totalsFor(pair.current, state.days),
      showProjects: !$("#share-hide-projects")?.checked,
    });
    download(`devlog-week-${stamp}.svg`, svg, "image/svg+xml");
  });
}

// Keeps only the chosen days so exports never include unrelated history.
function pick(list) {
  const subset = {};
  for (const day of list) if (state.days[day]) subset[day] = state.days[day];
  return subset;
}

// Connects the journal form and remove buttons; onChange re-renders the page.
function bindJournal(onChange) {
  $("#journal-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#journal-message");
    const text = $("#journal-text").value.trim();
    if (!text) return (message.textContent = "Write a note first.");
    const note = await postJournal("/api/journal", {
      date: $("#journal-date").value,
      project: $("#journal-project").value.trim(),
      text,
    });
    if (!note) return (message.textContent = "Could not save the note.");
    state.journal = [note, ...(state.journal || [])];
    onChange();
  });
  document.querySelectorAll("[data-note-remove]").forEach(
    (button) =>
      (button.onclick = async () => {
        const id = button.dataset.noteRemove;
        const ok = await postJournal("/api/journal/remove", { id });
        if (!ok) return;
        state.journal = (state.journal || []).filter((note) => note.id !== id);
        onChange();
      }),
  );
}

// Sends one journal request; returns the created note, true on removal, or null on failure.
async function postJournal(path, body) {
  try {
    const r = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const result = await r.json();
    return result.note || true;
  } catch {
    return null;
  }
}
