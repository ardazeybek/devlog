# Changelog

## 1.2.3

- Released devlog as open source under the MIT license.
- Removed written permission requirements from setup and contribution instructions.

## 1.2.2

- Fixed the header contribution link on the Marketplace overview.

## 1.2.1

- Updated the project guide with setup, contribution, support, and permission information.
- Refreshed the dashboard GIF and all six screenshots with synthetic activity.
- Updated the proprietary terms to require prior written permission for use.

- Refined the color language: deep teal for the brand, amber when the daily goal is reached, and a stable color per project and language.
- Showed how often the daily goal was reached in the last 30 days.
- Moved the today card to a calm surface with a goal progress bar.
- Added friendlier empty states, a compact layout for narrow windows, a dark appearance that follows the system, and stronger contrast when the system asks for it.
- Added keyboard focus on chart points, print and PDF output for Reports, and a monthly card download.
- Added a Sunday-evening weekly summary notification (`devlog.weeklySummaryNotification`).
- Added deleting one past day from its detail view. Deleted days stay hidden until a backup restores them.
- Replaced native date fields in custom ranges with scroll-wheel pickers.
- Smoothed the daily chart curve and softened its markers.
- Removed the line and paste counters from Statistics.
- Added All time, This year and custom date ranges.
- Added a year heatmap; select a day to see its details.
- Added project details with a daily trend.
- Added a Reports page with weekly and monthly comparisons, a share card and CSV or JSON export.
- Added a weekly goal next to the daily goal.
- Added backup download and restore. Restore adds only the days this device does not have yet.
- Added a session timeline for each day, shown when you select a day in the heatmap.
- Added branch insights per project, read from `.git/HEAD`.
- Added tracking preferences: `devlog.idleTimeoutSeconds` and `devlog.excludedProjects`. The dashboard explains why time is not counted.
- Added project groups and renamed-project aliases through `devlog.projectGroups` and `devlog.projectAliases`.
- Added a coding journal on the Reports page.

## 1.2.0

- Renamed the app to devlog.
- Added silent achievement and title notifications with confetti in the dashboard.
- Added VS Code notifications when the dashboard is not visible.
- Replaced native dropdowns with glass menus, including keyboard navigation.
- Removed the animation switch. Animations stay on.

## 1.1.0

- Removed the data download and preview controls from the dashboard.
- Shorter, clearer descriptions and connection messages.
- Added GitHub and contact links in Settings.
- Added project screenshots, an animated overview, and contribution guides.
- Published the source with a clear note about AI use.

## 1.0.0

- First public release with an English browser dashboard and liquid glass styling.
- Local activity tracking for saved and unsaved documents.
- Language and project statistics, daily goals, data export and demo mode.
- 229 achievements and 36 titles with XP and activity requirements.
- Explicit dashboard launcher, quiet healthy connections and clear error messages.
- No telemetry, accounts, native dependencies or lock-screen integration.
