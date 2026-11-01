// Settings page: daily and weekly goals, backup export and restore, community links.
import { current, state, token } from "../state.js";
import { $ } from "../helpers.js";
import { backupDocument, dateKey } from "../analytics.js";

// Builds the Settings page markup.
function settingsPage() {
  return /* HTML */ `<article class="card settings-card">
      <h2>Daily goal</h2>
      <form id="goal-form">
        <div class="goal-inputs">
          <label
            >Hours<input
              id="goal-hours"
              type="number"
              min="0"
              max="12"
              step="1"
              required
              value="${Math.floor(state.goal / 60)}" /></label
          ><label
            >Minutes<input
              id="goal-minutes"
              type="number"
              min="0"
              max="59"
              step="1"
              required
              value="${state.goal % 60}"
          /></label>
        </div>
        <button class="primary" type="submit" id="goal-save">Save</button
        ><span id="goal-message" role="status" aria-live="polite"></span>
      </form>
    </article>
    <article class="card settings-card">
      <h2>Weekly goal</h2>
      <form id="weekly-form">
        <div class="goal-inputs">
          <label
            >Hours per week<input
              id="weekly-hours"
              type="number"
              min="1"
              max="168"
              step="1"
              required
              value="${Math.floor(state.weeklyGoal / 60)}"
          /></label>
        </div>
        <button class="primary" type="submit" id="weekly-save">Save</button
        ><span id="weekly-message" role="status" aria-live="polite"></span>
      </form>
    </article>
    <article class="card settings-card">
      <h2>Backup and restore</h2>
      <p class="muted">
        Backups are plain JSON files that stay on your device. Restore adds days
        this device does not have yet and keeps existing days unchanged.
      </p>
      <div class="actions">
        <button type="button" id="backup-export">Download backup</button>
      </div>
      <form id="restore-form" class="restore-form">
        <input
          id="restore-file"
          type="file"
          accept="application/json,.json"
          required
        />
        <button type="submit" id="restore-run">Restore</button
        ><span id="restore-message" role="status" aria-live="polite"></span>
      </form>
    </article>
    <article class="card settings-card community-card">
      <h2>Help improve devlog</h2>
      <p>
        Found a bug or have an idea? Share it on GitHub. You can also send a
        pull request.
      </p>
      <div class="community-links">
        <a
          href="https://github.com/ardazeybek/devlog"
          target="_blank"
          rel="noopener noreferrer"
          >View on GitHub ↗</a
        ><a href="mailto:quantastudio.dev@gmail.com">Contact me ↗</a>
      </div>
    </article>`;
}

// Sends one goal value to the extension and reports the result on the button.
async function saveGoal({ body, button, message, onSaved }) {
  button.disabled = true;
  message.textContent = "Saving…";
  try {
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw Error();
    onSaved(await r.json());
    message.textContent = "Saved.";
    globalThis.DevlogMotion?.feedback(button);
  } catch {
    message.textContent = "Could not save. Open devlog again from VS Code.";
    globalThis.DevlogMotion?.feedback(button, false);
  } finally {
    button.disabled = false;
  }
}

// Validates an hours and minutes pair and returns minutes, or null when invalid.
function readMinutes(hoursInput, minutesInput) {
  const hours = Number(hoursInput.value),
    minutes = Number(minutesInput.value),
    total = hours * 60 + minutes;
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59 ||
    total < 15 ||
    total > 720
  )
    return null;
  return total;
}

// Reads a backup file, posts it to the restore route and shows the outcome.
async function restoreBackup(message, button) {
  const file = $("#restore-file")?.files?.[0];
  if (!file) return (message.textContent = "Choose a backup file first.");
  if (file.size > 10 * 1024 * 1024)
    return (message.textContent = "This file is larger than 10 MB.");
  button.disabled = true;
  message.textContent = "Restoring…";
  try {
    const r = await fetch("/api/restore", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await file.text(),
    });
    if (!r.ok) throw Error();
    const result = await r.json();
    message.textContent = `Restored ${result.restored} days. Skipped ${result.skipped} days this device already has.`;
  } catch {
    message.textContent = "This file is not a valid devlog backup.";
  } finally {
    button.disabled = false;
  }
}

// Downloads every saved day as a restorable backup file.
function downloadBackup() {
  const text = JSON.stringify(backupDocument(state.days), null, 2);
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `devlog-backup-${dateKey(new Date())}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Connects every Settings form and button after the page is rendered.
function bindSettings() {
  if (current !== "settings") return;
  $("#goal-form").onsubmit = (e) => {
    e.preventDefault();
    const goal = readMinutes($("#goal-hours"), $("#goal-minutes"));
    const message = $("#goal-message");
    if (goal === null)
      return (message.textContent =
        "Choose a goal between 15 minutes and 12 hours.");
    saveGoal({
      body: { dailyGoalMinutes: goal },
      button: $("#goal-save"),
      message,
      onSaved: (saved) => (state.goal = saved.goal),
    });
  };
  $("#weekly-form").onsubmit = (e) => {
    e.preventDefault();
    const hours = Number($("#weekly-hours").value);
    const message = $("#weekly-message");
    if (!Number.isInteger(hours) || hours < 1 || hours > 168)
      return (message.textContent = "Choose between 1 and 168 hours.");
    saveGoal({
      body: { weeklyGoalMinutes: hours * 60 },
      button: $("#weekly-save"),
      message,
      onSaved: (saved) => (state.weeklyGoal = saved.weeklyGoal),
    });
  };
  $("#backup-export").onclick = downloadBackup;
  $("#restore-form").onsubmit = (e) => {
    e.preventDefault();
    restoreBackup($("#restore-message"), $("#restore-run"));
  };
}

export { settingsPage, bindSettings };
