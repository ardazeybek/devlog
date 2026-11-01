// Branch insight table and project-group table for the Projects page.
import { esc, duration } from "../helpers.js";
import { emptyState } from "./empty.js";

// Builds a table from rows with a label, a secondary label and seconds.
function rowsTable(headers, rows, total) {
  return `<table class="table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}<th>Share</th></tr></thead><tbody>${rows
    .map(
      ([a, b, seconds]) =>
        `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${duration(seconds)}</td><td>${Math.round((seconds / Math.max(1, total)) * 100)}%</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

// Builds the branch insight card from project and branch rows.
export function branchCard(branches) {
  const total = branches.reduce((sum, row) => sum + row.seconds, 0);
  const body = branches.length
    ? rowsTable(
        ["Project", "Branch", "Active time"],
        branches.map((row) => [row.project, row.branch, row.seconds]),
        total,
      )
    : emptyState(
        "No branch time yet. Branches come from project folders that are Git repositories.",
      );
  return `<article class="card"><h2>Branch insights</h2>${body}</article>`;
}

// Builds the project group card from [group, member list, seconds] rows.
export function groupsCard(groups, total) {
  const body = groups.length
    ? rowsTable(["Group", "Projects", "Active time"], groups, total)
    : emptyState("No projects yet. Create groups in devlog.projectGroups.");
  return `<article class="card"><h2>Project groups</h2><p class="muted">Set groups in VS Code settings under devlog.projectGroups.</p>${body}</article>`;
}
