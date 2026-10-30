import { esc, duration } from "../helpers.js";

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
                      <td>${esc(p)}</td>
                      <td>${duration(v)}</td>
                      <td>${Math.round((v / Math.max(1, total)) * 100)}%</td>
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>`
        : '<div class="empty">No projects yet.</div>'
    }
  </article>`;

  return table;
}
