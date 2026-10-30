# Project map

## Directory responsibilities

```text
devlog/
├── src/
│   ├── extension/                 # Runs in the VS Code extension host
│   │   ├── index.js              # Activation and service wiring
│   │   ├── tracking/             # Editor eligibility, edits and active time
│   │   ├── storage/              # Session records and atomic persistence
│   │   ├── rewards/              # Cross-window reward notification history
│   │   ├── dashboard/            # Local HTTP server and public asset allowlist
│   │   └── ui/                   # VS Code sidebar and status bar
│   └── shared/                    # Rules used by both Node and the browser
├── web/
│   ├── index.html                # Browser shell and asset load order
│   ├── dashboard/
│   │   ├── app.js                # Browser entry, polling and navigation
│   │   ├── state.js              # Session token, selected tab and API snapshot
│   │   ├── render.js             # Render lifecycle and scroll restoration
│   │   ├── helpers.js            # Formatting, grouping and small HTML helpers
│   │   ├── pages/                # Page templates and page event handlers
│   │   ├── components/           # Reusable metric, language, goal, table and chart cards
│   │   └── ui/                   # Select menus, motion and celebrations
│   └── styles/                   # Ordered CSS files grouped by responsibility
├── test/
│   ├── unit/                     # Pure rules, storage and reward claims
│   ├── integration/              # Extension activation, tracking and real HTTP requests
│   └── dashboard/                # Real browser modules with a controlled DOM fixture
├── scripts/                      # Development commands
├── docs/
│   ├── architecture/             # Project map and data contracts
│   └── development/              # Change guide and refactor notes
├── media/                        # Marketplace images and extension icons
├── .github/                      # CI and contribution templates
└── .vscode/                      # Extension debugging configuration
```

## Extension modules

| File                           | Owns                                                                                           | Does not own                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/extension/index.js`       | Storage setup, service construction, API snapshot, native reward notifications, final disposal | Edit rules, HTTP routing, HTML rendering    |
| `tracking/rules.js`            | Date keys, edit classification, file exclusions, document eligibility, language detection      | VS Code listeners or persistence            |
| `tracking/activity-tracker.js` | Per-window activity record, editor listeners, idle state, five-second timer, pause, saving     | Browser HTTP or notification presentation   |
| `storage/activity-store.js`    | Empty-day schema, validated aggregation, atomic JSON writes                                    | UI or time eligibility                      |
| `rewards/reward-tracker.js`    | Earned-event conversion, locking, already-seen IDs and recent events                           | Achievement thresholds or UI                |
| `dashboard/server.js`          | Loopback server lifecycle, authentication, API routes, settings writes, response headers       | Counting activity                           |
| `dashboard/assets.js`          | Explicit URL-to-file map                                                                       | Directory serving or private storage access |
| `ui/launcher.js`               | Sidebar entries and command registration                                                       | Tracking decisions                          |
| `ui/status-bar.js`             | Status icon and tooltip presentation                                                           | Recorded activity                           |

Paths in the first column after `index.js` are relative to `src/extension/`.

## Browser modules

| File                 | Responsibility                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `state.js`           | Captures the URL token into session storage; exposes live state bindings and setters                     |
| `app.js`             | Polls `/api/stats`, displays connection issues, responds to navigation and visibility                    |
| `render.js`          | Computes the selected date range, composes pages, binds handlers, restores scroll and invokes UI effects |
| `helpers.js`         | Escaping, local calendar keys, durations, totals, grouping, current streak, bars and flame markup        |
| `pages/activity.js`  | Overview and statistics page composition                                                                 |
| `pages/awards.js`    | Achievement filters, award cards, next badges, title catalog and filter handlers                         |
| `pages/settings.js`  | Daily-goal form, validation, settings request and community links                                        |
| `components/`        | Chart SVG, metric summary, language breakdown, daily-goal card and project table                         |
| `ui/controls.js`     | Accessible custom selects backed by native values and change events                                      |
| `ui/motion.js`       | Card, chart, counter, hover and button animations; animation cleanup before rendering                    |
| `ui/celebrations.js` | Quiet reward cards, pending events while hidden and confetti                                             |

Paths are relative to `web/dashboard/`.

`ui/` scripts expose `DevlogControls`, `DevlogMotion` and `DevlogCelebrations`. They remain classic scripts to keep their independent initialization and optional hooks. `src/shared/achievements.js` and `languages.js` expose `DevlogAchievements` and `DevlogLanguages` in the browser, and `module.exports` in Node. These five globals are intentional; dashboard state and page functions use explicit ES imports instead of implicit cross-file globals.

## CSS order

`web/index.html` is the source of truth for stylesheet order:

1. `foundation.css`: defaults, ambient background, shell, navigation and base inputs.
2. `activity.css`: cards, metrics, charts, language rows, bars, streaks and goal ring.
3. `awards.css`: achievements and filters.
4. `forms-and-tables.css`: project tables, empty states, settings inputs and buttons.
5. `responsive.css`: original breakpoints and accessibility fallbacks.
6. `titles.css`: title catalog, checks and its breakpoints.
7. `typography.css`: local font fallbacks, numeric emphasis and scroll anchoring.
8. `motion.css`: animation presentation and keyframes.
9. `surfaces.css`: layered glass surfaces and their accessibility fallbacks.
10. `palette.css`: final palette, depth and hover overrides.
11. `status-and-languages.css`: connection issues and language symbols.
12. `community.css`: community links in Settings.
13. `select.css`: glass listboxes and keyboard focus styling.
14. `celebrations.css`: reward cards, confetti and final small-screen overrides.

The existing cascade is preserved deliberately. Some selectors appear in both base component files and later surface/palette files: the former own layout, the latter override presentation. Moving a rule across files can change specificity precedence even when its text is unchanged.

## Root documents

`README.md` is the product introduction. `DEVELOPMENT.md` is the contributor entry point. `CONTRIBUTING.md`, `SUPPORT.md`, `PRIVACY.md`, `CHANGELOG.md` and `LICENSE` remain at the root so GitHub and Marketplace visitors can find them directly. `AGENTS.md` gives future coding assistants a short orientation and repository conventions.
