// Coding journal card: a short note form and the saved notes, newest first.
import { esc } from "../helpers.js";
import { emptyState } from "./empty.js";

// Builds one saved note row with its remove button.
function noteItem(note) {
  return `<li class="journal-item">
    <div><b>${esc(note.date)}</b>${note.project ? ` · ${esc(note.project)}` : ""}</div>
    <p>${esc(note.text)}</p>
    <button type="button" class="link-button" data-note-remove="${esc(note.id)}">Remove</button>
  </li>`;
}

// Builds the journal card for the Reports page.
export function journalCard({ notes, projects, today }) {
  const options = projects
    .map(([name]) => `<option value="${esc(name)}"></option>`)
    .join("");
  return /* HTML */ `<article class="card journal-card">
    <h2>Coding journal</h2>
    <p class="muted">Short notes stay on this device, next to your time.</p>
    <form id="journal-form" class="journal-form">
      <label
        >Date<input id="journal-date" type="date" value="${today}" required
      /></label>
      <label
        >Project<input
          id="journal-project"
          list="journal-projects"
          maxlength="200"
          placeholder="Optional"
      /></label>
      <datalist id="journal-projects">${options}</datalist>
      <label class="journal-text"
        >Note<textarea
          id="journal-text"
          maxlength="500"
          rows="3"
          required
          placeholder="What did you finish today?"
        ></textarea>
      </label>
      <div class="actions">
        <button class="primary" type="submit" id="journal-save">
          Save note</button
        ><span id="journal-message" role="status" aria-live="polite"></span>
      </div>
    </form>
    ${notes.length ? `<ul class="journal-list">${notes.map(noteItem).join("")}</ul>` : emptyState("No notes yet. Write one above.")}
  </article>`;
}
