# Working on devlog

devlog is a VS Code extension with a browser dashboard. Start with the [project map](docs/architecture/project-map.md), then read the [data flow](docs/architecture/data-flow.md). For a specific change, use the [change guide](docs/development/change-guide.md).

All source code, identifiers, comments, filenames, UI text, and documentation must be in English.

## Run locally

Use Node.js 20 or newer and desktop VS Code 1.90 or newer. Open this repository in VS Code and press **F5**. Edit a saved or unsaved file in the Extension Development Host, then run **devlog: Open Dashboard**. Keep development data separate from your normal VS Code profile.

`package.json` points VS Code to `src/extension/index.js`. There is no compilation or bundling step. Node loads the extension with CommonJS; the browser loads dashboard files with native ES modules. Two shared modules also expose browser globals so exactly the same reward and language rules run in both environments.

## Run checks

```sh
npm test
```

Tests use Node's built-in test runner and require no dependency installation. They cover tracking, storage, HTTP access checks, the browser asset graph, dashboard refresh, achievements, and titles. The dashboard test uses Node's experimental VM module API to load the real ES module graph in an isolated DOM fixture; the extension itself does not require experimental flags.

For consistent formatting:

```sh
npm ci
npm run format:check
npm run format
```

Prettier is a development dependency only. There are no runtime dependencies. `.editorconfig` defines whitespace defaults, and `.prettierrc.json` defines formatting. HTML template literals use `/* HTML */` so their markup is formatted too.

## Make a package

With Microsoft's `@vscode/vsce` installed:

```sh
vsce ls --no-dependencies
vsce package --no-dependencies
```

The package allowlist in `.vscodeignore` includes `src/`, `web/`, the extension icons, and user-facing documents. Tests, development tools, architecture guides, and recordings are excluded. `src/extension/dashboard/assets.js` is a separate HTTP allowlist: packaged extension files must never automatically become public URLs.

## Suggested reading order

1. `web/index.html`: page shell, navigation, script and stylesheet order.
2. `web/dashboard/app.js`: fetching snapshots and handling navigation.
3. `web/dashboard/render.js`: rendering lifecycle and scroll preservation.
4. `web/dashboard/pages/` and `components/`: HTML templates and page behavior.
5. `src/extension/index.js`: how the extension services are connected.
6. `src/extension/tracking/` and `storage/`: how edits become saved time.
7. `src/shared/achievements.js` and `src/extension/rewards/`: reward rules and notification claims.

The first version was written with AI. This structure and its guides are intended to help a new contributor learn the actual implementation and make focused changes.
