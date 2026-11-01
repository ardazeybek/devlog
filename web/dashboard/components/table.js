// Project table; each project name opens its detail view.
import { esc, duration } from "../helpers.js";
import { emptyState } from "./empty.js";
import { colorFor } from "../analytics.js";

// Builds the project table for the selected range.
export function tableCard({ projects, total }) {
  const table = /* HTML */ `<article class="card">
    <h2>Project activity</h2>
    ${
      projects.length
        ? /* HTML */ `<table class="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Active time</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              ${projects
                .map(
                  ([p, v]) =>
                    /* HTML */ `<tr>
                      <td>
                        <i class="swatch" style="background:${colorFor(p)}"></i>
                        <button
                          class="link-button"
                          type="button"
                          data-project="${esc(p)}"
                        >
                          ${esc(p)}
                        </button>
                      </td>
                      <td>${duration(v)}</td>
                      <td>${Math.round((v / Math.max(1, total)) * 100)}%</td>
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : emptyState("No projects yet. Edit a file in VS Code to start.")
    }
  </article>`;

  return table;
}
