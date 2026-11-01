# Repository orientation

Read `DEVELOPMENT.md`, `docs/architecture/project-map.md` and `docs/architecture/data-flow.md` before changing module boundaries. Use `docs/development/change-guide.md` to find the relevant owner.

## Language and layout

All project content must be in English, including filenames, identifiers, methods, comments, test descriptions, UI text and documentation. Keep VS Code services in `src/extension/`, shared rules in `src/shared/`, browser modules in `web/dashboard/`, and presentation styles in `web/styles/`.

Keep the extension's CommonJS entry and the dashboard's explicit ES imports working without a build step. Preserve the documented classic-script globals and HTML stylesheet order. A new browser file needs both an import/link and an entry in `src/extension/dashboard/assets.js`.

## Existing contracts

Source refactors should preserve version-1 activity records, storage location, extension identity, command IDs, configuration keys, reward IDs and thresholds. Activity stays local. Use synthetic fixtures; never commit real activity or session tokens. Public HTTP assets are an explicit allowlist, separate from the extension package allowlist.

## Checks

`npm test` runs without installed dependencies. `npm ci` installs development formatting tools; `npm run format:check` verifies formatting. For packaging changes, inspect `vsce ls --no-dependencies` and a built VSIX. For UI changes, verify the affected page in a real browser as well as tests. Update the project map and change guide when moving responsibilities.
