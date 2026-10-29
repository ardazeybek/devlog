# Working on devlog

devlog is a VS Code extension with a browser dashboard. The first version was written with AI. This guide is also a starting point for learning how the pieces work.

## Files to start with

| File | What it does |
| --- | --- |
| `web/index.html` | The page header, navigation, and content container |
| `web/app.js` | Builds the cards, charts, achievements, and settings screens |
| `web/style.css` | The glass panels, layout, colors, and responsive styles |
| `web/motion.js` | Animates the charts, cards, and counters |
| `web/achievements.js` | Calculates achievements, XP, and title requirements |
| `web/languages.js` | Language names and symbols |
| `extension.js` | Watches editor activity and serves the local dashboard |
| `core.js` | Checks edits, file exclusions, and language detection |
| `storage.js` | Saves and combines activity records |

Some HTML is written as template strings in `web/app.js`, so a change to a card may start there rather than in `index.html`.

## Run it locally

Use desktop VS Code 1.90 or newer. Open this folder and press F5. A separate Extension Development Host window opens with devlog loaded. Edit a file in that window, then use **devlog: Open Dashboard**.

The dashboard server starts only when you open it. It listens on `127.0.0.1` and protects the data API with a random token. Keep development data separate from your normal VS Code profile.

## Run checks

With Node.js 20 or newer installed:

```sh
npm test
```

No dependency install is needed for the tests. They cover edit counting, unsaved documents, idle behavior, storage, access checks, scroll position, achievements, and title requirements. GitHub Actions runs them on Windows, macOS, and Linux.

## Make a package

Install Microsoft's `@vscode/vsce` tool, then run `vsce package`. The package allowlist excludes tests, development guides, recordings, and GitHub configuration. Runtime files, the icon, and user-facing documents are included.

## Learning plan

Arda is starting with HTML. The plan is to understand the page structure and templates, take on small fixes, then learn the CSS and JavaScript needed to work on more of the app. This is a plan, not a claim that every part is already understood.
