# Where to make a change

| Desired change                                   | Start here                                   | Check next                                                |
| ------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------- |
| Header, navigation or page shell                 | `web/index.html`                             | Stylesheet/script order and tab IDs                       |
| Overview or statistics layout                    | `web/dashboard/pages/activity.js`            | Reusable `components/` and `render.js`                    |
| Metric, goal, language, project or chart markup  | `web/dashboard/components/`                  | `styles/activity.css` or `forms-and-tables.css`           |
| Achievement filters or title display             | `web/dashboard/pages/awards.js`              | `styles/awards.css`, `titles.css` and shared rules        |
| Daily goal form                                  | `web/dashboard/pages/settings.js`            | Settings route in `src/extension/dashboard/server.js`     |
| Tracking eligibility or paste classification     | `src/extension/tracking/rules.js`            | `test/unit/core.test.js` and integration tracking tests   |
| Idle, focus or pause behavior                    | `src/extension/tracking/activity-tracker.js` | `test/integration/tracking.test.js`                       |
| Storage fields or aggregation                    | `src/extension/storage/activity-store.js`    | Existing records and storage tests                        |
| Achievement thresholds, XP or title requirements | `src/shared/achievements.js`                 | Reward tests; preserve IDs unless planning a migration    |
| Reward notification claims                       | `src/extension/rewards/reward-tracker.js`    | Multi-window and restart tests                            |
| Native notification wording                      | `src/extension/index.js`                     | `test/integration/extension-rewards.test.js`              |
| Sidebar or status text                           | `src/extension/ui/`                          | Activation and command registration                       |
| Animation or dropdown behavior                   | `web/dashboard/ui/`                          | Associated CSS, keyboard behavior and scroll preservation |
| Language display names or symbols                | `src/shared/languages.js`                    | Unknown language fallback and escaping                    |
| A new browser file                               | Relevant `web/` folder                       | Import/link plus `dashboard/assets.js` allowlist          |
| Packaged files or entry point                    | `package.json` and `.vscodeignore`           | `vsce ls --no-dependencies` and the actual VSIX           |

## Conventions

- Use English throughout: filenames, identifiers, comments, UI text, tests and documents.
- Prefer descriptive names and one responsibility per module. Keep related templates and handlers together; avoid splitting every tiny function into its own file.
- Keep Node/VS Code code in `src/extension/`, browser presentation in `web/`, and host-independent shared rules in `src/shared/`.
- The extension uses CommonJS; dashboard page modules use native ES modules with explicit `.js` imports. Shared and optional UI scripts expose only their documented globals.
- Use `/* HTML */` before HTML template literals. Escape user-derived text with `esc()` or use `textContent` when creating DOM nodes directly.
- Follow the existing CSS order in `web/index.html`. Prefer component layout rules in component styles and visual overrides in `surfaces.css` or `palette.css`.
- Preserve storage contracts, extension identity and public command/configuration IDs when reorganizing code.
- Keep real activity, tokens, private project names and recordings out of commits and test fixtures.

## Verification

Run `npm test` after behavior or module-path changes. Run `npm run format:check` after installing development dependencies. For browser changes, open the dashboard through an Extension Development Host, inspect the affected tabs, exercise the controls, and check that refresh preserves scroll and in-progress form edits. For packaging changes, inspect the VSIX and confirm every public asset is included without development dependencies.

The HTTP integration test follows the actual HTML references and ES imports through the running server. The dashboard test loads real ES modules in a small DOM fixture; it does not replace a visual browser check or a full VS Code host session.
