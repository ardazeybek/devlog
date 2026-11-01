# src/extension

VS Code host code. Entry point is `index.js`; each subfolder owns one responsibility.

- `index.js`: activation, service wiring and the dashboard snapshot.
- `tracking/`: editor eligibility, edits, sessions, branches and active time.
- `storage/`: activity files, aggregation and backup restore.
- `journal/`: coding notes outside the activity records.
- `summary/`: weekly summary notification.
- `rewards/`: reward notification history.
- `dashboard/`: loopback HTTP server and public asset allowlist.
- `ui/`: sidebar, commands and status bar.
