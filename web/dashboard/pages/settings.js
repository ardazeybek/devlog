import { current, state, token } from "../state.js";
import { $ } from "../helpers.js";
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
function bindSettings() {
  if (current !== "settings") return;
  $("#goal-form").onsubmit = async (e) => {
    e.preventDefault();
    const hours = Number($("#goal-hours").value),
      minutes = Number($("#goal-minutes").value),
      goal = hours * 60 + minutes,
      msg = $("#goal-message"),
      button = $("#goal-save");
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      minutes < 0 ||
      minutes > 59 ||
      goal < 15 ||
      goal > 720
    ) {
      msg.textContent = "Choose a goal between 15 minutes and 12 hours.";
      return;
    }
    button.disabled = true;
    msg.textContent = "Saving…";
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dailyGoalMinutes: goal }),
      });
      if (!r.ok) throw Error();
      const saved = await r.json();
      state.goal = saved.goal;
      msg.textContent = "Saved.";
      globalThis.DevlogMotion?.feedback(button);
    } catch {
      msg.textContent = "Could not save. Open devlog again from VS Code.";
      globalThis.DevlogMotion?.feedback(button, false);
    } finally {
      button.disabled = false;
    }
  };
}

export { settingsPage, bindSettings };
