# Structure refactor notes

## Baseline and scope

The starting point was commit `714e39a6079fd17068c2b8291f145ab486d34107` on `main` (version 1.2.0). The refactor separates responsibilities, expands compressed code and templates, documents the architecture, and adds reproducible formatting. It does not introduce a new product feature or change the extension's version or published Marketplace release.

## Old-to-new map

| Previous path                                     | Current owner                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `extension.js`                                    | `src/extension/index.js`, `tracking/activity-tracker.js`, `dashboard/server.js`, `dashboard/assets.js`, `ui/launcher.js`, `ui/status-bar.js` |
| `core.js`                                         | `src/extension/tracking/rules.js`                                                                                                            |
| `storage.js`                                      | `src/extension/storage/activity-store.js`                                                                                                    |
| `rewards.js`                                      | `src/extension/rewards/reward-tracker.js`                                                                                                    |
| `web/achievements.js`                             | `src/shared/achievements.js`                                                                                                                 |
| `web/languages.js`                                | `src/shared/languages.js`                                                                                                                    |
| `web/app.js`                                      | `web/dashboard/app.js`, `state.js`, `helpers.js`, `render.js`, `pages/` and `components/`                                                    |
| `web/controls.js`, `motion.js`, `celebrations.js` | `web/dashboard/ui/`                                                                                                                          |
| `web/style.css`                                   | Ordered files in `web/styles/`; see the project map                                                                                          |
| `test/*.test.js`                                  | `test/unit/`, `test/integration/` and `test/dashboard/`                                                                                      |

Extension-relative paths in the first row belong under `src/extension/`. The browser and VS Code entry points, static URL map, package allowlist, test discovery and documentation links were updated together.

## Compatibility decisions

- Retain the version-1 storage schema, storage location, extension identity, command IDs, settings keys, reward IDs and reward thresholds.
- Keep the current idle, edit classification, focus, local-day and reward-calendar behavior.
- Keep the existing CSS declaration order and visual overrides while separating their responsibilities.
- Use native browser ES imports for dashboard state/pages; keep documented shared/UI script globals for existing independent initialization.
- Keep runtime dependency-free and build-free. Prettier is pinned as a development dependency.
- Use explicit public assets. The server no longer has a directory exception for unshipped icons; private extension files and unknown URLs remain inaccessible.
- Require English for code, identifiers, comments, filenames, tests, interface text and documentation.

## Verification performed

- All 15 existing test cases passed before and after refactoring on the local Node.js 26 environment.
- The HTTP integration check was extended to follow the real HTML and ES module references through the server, verify successful GET/HEAD responses and MIME types, and reject private files and inherited object-key paths.
- The dashboard scroll check now loads the actual ES module graph with Node's VM module API, preserving live import bindings.
- Shared metrics, achievement and title outputs matched the baseline for 40 synthetic histories.
- All CSS declarations and their cascade order matched the original stylesheet after normalizing formatting.
- Formatting and Git whitespace checks passed.
- Browser checks with synthetic activity covered Overview, Statistics, Achievements, Projects and Settings, achievement search, and saving a 90-minute goal. No browser console errors were reported during these checks.
- All three extension integration checks also passed against the extracted VSIX runtime.
- A review VSIX was built, and its manifest entry point and every public asset were checked against its ZIP contents. Tests, architecture guides and development dependencies were excluded from the package.
- GitHub Actions retains Windows/macOS/Linux checks on Node.js 20 and 22 and adds a formatting job. Their remote results should be reviewed on the pull request.

A full Extension Development Host UI session and native Windows/macOS execution were not performed locally. Browser checks use synthetic records rather than personal coding history. The review package is not a Marketplace publication.
