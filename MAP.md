# devlog architecture map

devlog counts active VS Code coding time locally and shows it in a loopback browser dashboard.

## Folders

| Folder           | Task                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `src/extension/` | VS Code host code: tracking, storage, journal, summary, rewards, local server, sidebar and status bar |
| `src/shared/`    | Achievement rules and language names used by both Node and the browser                                |
| `web/`           | Dashboard shell, browser modules and stylesheets                                                      |
| `test/`          | Unit, integration and browser-module tests                                                            |
| `docs/`          | Architecture, data contracts and contributor guides                                                   |
| `scripts/`       | Test runner                                                                                           |
| `media/`         | Icons and Marketplace images                                                                          |

## Main flow

1. `tracking/rules.js` decides whether an edit is eligible.
2. `tracking/activity-tracker.js` credits active time into one JSON file per window.
3. `storage/activity-store.js` aggregates files and restores backups.
4. `index.js` builds the snapshot and reward state.
5. `dashboard/server.js` serves the authenticated API and the public allowlist.
6. `web/dashboard/app.js` polls the API; `render.js` composes pages.
7. `analytics.js` resolves ranges and summaries for pages, reports and exports.

Detailed contracts are in `docs/architecture/data-flow.md`; file ownership is in `docs/architecture/project-map.md`.
