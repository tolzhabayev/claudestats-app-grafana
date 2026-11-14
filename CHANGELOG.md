# Changelog

## 2.0.1

### Fixed

- The plugin no longer bundles its own copy of React's JSX runtime and uses the one Grafana provides, which clears the React 19 `jsxRuntimeImport` warning from the plugin validator.

### Changed

- The frontend now builds with Rspack 2 instead of webpack, following the create-plugin `rspack` migration.

## 2.0.0

### Breaking changes

- Requires Grafana 13.2.0 or later (was 12.3.0). The plugin now builds on the create-plugin 9 template with React 19 ([#56](https://github.com/tolzhabayev/claudestats-app-grafana/issues/56)).

### Added

- New tabs built from Claude Code events in Loki (needs `OTEL_LOGS_EXPORTER`):
  - **Reliability**: API errors, exhausted retries and refusals ([#35](https://github.com/tolzhabayev/claudestats-app-grafana/issues/35), [#80](https://github.com/tolzhabayev/claudestats-app-grafana/issues/80))
  - **Prompts**: prompt volume, slash commands and prompt length ([#37](https://github.com/tolzhabayev/claudestats-app-grafana/issues/37), [#82](https://github.com/tolzhabayev/claudestats-app-grafana/issues/82))
  - **Workflow**: request latency by model and effort, cache lifetimes, subagents, compaction, skills, MCP connections and hooks ([#62](https://github.com/tolzhabayev/claudestats-app-grafana/issues/62), [#83](https://github.com/tolzhabayev/claudestats-app-grafana/issues/83))
  - **Security**: permission escalations, auto mode verdicts, rejected tool calls, login failures, plugin installs and managed settings ([#63](https://github.com/tolzhabayev/claudestats-app-grafana/issues/63), [#84](https://github.com/tolzhabayev/claudestats-app-grafana/issues/84))
- **Traces** tab (beta), built from traces in Tempo: interactions, model requests with time to first token, and a trace waterfall ([#38](https://github.com/tolzhabayev/claudestats-app-grafana/issues/38), [#87](https://github.com/tolzhabayev/claudestats-app-grafana/issues/87))
- **Setup Guide** on the configuration page picks the destination and features, then builds the matching environment variables, including events and traces ([#109](https://github.com/tolzhabayev/claudestats-app-grafana/issues/109))
- Filters:
  - **Repository** filter, plus pickers for your own labels such as cost center, set on the configuration page ([#27](https://github.com/tolzhabayev/claudestats-app-grafana/issues/27), [#72](https://github.com/tolzhabayev/claudestats-app-grafana/issues/72))
  - **Team** filter from the identity-provider groups (`user_groups`) of Claude apps gateway sessions ([#61](https://github.com/tolzhabayev/claudestats-app-grafana/issues/61), [#89](https://github.com/tolzhabayev/claudestats-app-grafana/issues/89))
- Overview:
  - team leaderboard and efficiency ratios ([#58](https://github.com/tolzhabayev/claudestats-app-grafana/issues/58), [#78](https://github.com/tolzhabayev/claudestats-app-grafana/issues/78))
  - change vs the previous period on the totals ([#58](https://github.com/tolzhabayev/claudestats-app-grafana/issues/58), [#86](https://github.com/tolzhabayev/claudestats-app-grafana/issues/86))
  - **Surface** donut (needs `OTEL_METRICS_INCLUDE_ENTRYPOINT=true`) ([#58](https://github.com/tolzhabayev/claudestats-app-grafana/issues/58), [#88](https://github.com/tolzhabayev/claudestats-app-grafana/issues/88))
  - **Sessions by Start Type** donut, based on the `session.count` metric ([#32](https://github.com/tolzhabayev/claudestats-app-grafana/issues/32), [#43](https://github.com/tolzhabayev/claudestats-app-grafana/issues/43))
- Cost and tokens:
  - by subagent, skill and MCP server ([#29](https://github.com/tolzhabayev/claudestats-app-grafana/issues/29), [#41](https://github.com/tolzhabayev/claudestats-app-grafana/issues/41))
  - by speed (fast mode) and effort ([#30](https://github.com/tolzhabayev/claudestats-app-grafana/issues/30), [#42](https://github.com/tolzhabayev/claudestats-app-grafana/issues/42))
  - by plugin and MCP tool ([#60](https://github.com/tolzhabayev/claudestats-app-grafana/issues/60), [#71](https://github.com/tolzhabayev/claudestats-app-grafana/issues/71))
- Tools tab:
  - acceptance rate by language and decisions by source ([#31](https://github.com/tolzhabayev/claudestats-app-grafana/issues/31), [#69](https://github.com/tolzhabayev/claudestats-app-grafana/issues/69))
  - tool performance from `tool_result` events ([#36](https://github.com/tolzhabayev/claudestats-app-grafana/issues/36), [#81](https://github.com/tolzhabayev/claudestats-app-grafana/issues/81))
- Productivity tab:
  - active time split into user and CLI ([#33](https://github.com/tolzhabayev/claudestats-app-grafana/issues/33), [#66](https://github.com/tolzhabayev/claudestats-app-grafana/issues/66))
  - **Lines of Code by Model** ([#34](https://github.com/tolzhabayev/claudestats-app-grafana/issues/34), [#68](https://github.com/tolzhabayev/claudestats-app-grafana/issues/68))
- Attribution panels say why they're empty, for example "No subagent ran in this period" ([#58](https://github.com/tolzhabayev/claudestats-app-grafana/issues/58), [#88](https://github.com/tolzhabayev/claudestats-app-grafana/issues/88))
- Example Grafana alert rules for cost spikes, API error rate, refusals and `bypassPermissions` sessions under `examples/alerting/` ([#40](https://github.com/tolzhabayev/claudestats-app-grafana/issues/40), [#79](https://github.com/tolzhabayev/claudestats-app-grafana/issues/79), [#85](https://github.com/tolzhabayev/claudestats-app-grafana/issues/85))
- Plugin documentation, shown as the **Documentation** tab on the catalog page, including which Claude Code settings each feature needs ([#39](https://github.com/tolzhabayev/claudestats-app-grafana/issues/39), [#65](https://github.com/tolzhabayev/claudestats-app-grafana/issues/65), [#74](https://github.com/tolzhabayev/claudestats-app-grafana/issues/74))

### Changed

- Visual polish: neutral colors, bars per interval on Over Time charts, and panel descriptions ([#59](https://github.com/tolzhabayev/claudestats-app-grafana/issues/59), [#75](https://github.com/tolzhabayev/claudestats-app-grafana/issues/75))
- Session counts use the `session.count` metric and leave out the local `claude agents` dashboard process ([#32](https://github.com/tolzhabayev/claudestats-app-grafana/issues/32), [#43](https://github.com/tolzhabayev/claudestats-app-grafana/issues/43))
- The default time range is the last 7 days ([#57](https://github.com/tolzhabayev/claudestats-app-grafana/issues/57))

### Fixed

- Usage without `user_email` (API key, Bedrock, Vertex and Foundry users) is attributed to `enduser_id` or `user_id` instead of being dropped ([#61](https://github.com/tolzhabayev/claudestats-app-grafana/issues/61), [#70](https://github.com/tolzhabayev/claudestats-app-grafana/issues/70))
- The Cache Read stat was always empty ([#57](https://github.com/tolzhabayev/claudestats-app-grafana/issues/57))
- The Model picker is hidden on tabs whose metrics have no model label ([#57](https://github.com/tolzhabayev/claudestats-app-grafana/issues/57))
- Over Time charts no longer drop counter jumps between bars, and use a 1m minimum step ([#76](https://github.com/tolzhabayev/claudestats-app-grafana/issues/76), [#77](https://github.com/tolzhabayev/claudestats-app-grafana/issues/77))
- Bar gauges start at zero, so the smallest bar or a single bar is no longer drawn empty ([#91](https://github.com/tolzhabayev/claudestats-app-grafana/issues/91))
- The Traces tab no longer shows an error and sends failing Tempo queries before a trace is picked ([#93](https://github.com/tolzhabayev/claudestats-app-grafana/issues/93))
- Event tabs no longer say telemetry is missing when there is simply nothing to show: counts show 0 and breakdowns say what didn't happen, such as "No refusals in this period" ([#94](https://github.com/tolzhabayev/claudestats-app-grafana/issues/94))
- The Traces tables show their key columns with readable names, and a Model Requests trace ID opens the trace ([#92](https://github.com/tolzhabayev/claudestats-app-grafana/issues/92))
- Counts show whole numbers, costs show cents, and the Cost Breakdown table has Team Member, Model and Cost columns without the query time ([#95](https://github.com/tolzhabayev/claudestats-app-grafana/issues/95))
- Narrow panels stay readable: bar gauge text no longer grows to heading size, MCP tool labels lead with the tool, leaderboard headers and pie legends fit, and the Surface hint is no longer cut off ([#96](https://github.com/tolzhabayev/claudestats-app-grafana/issues/96))
- The vs Previous Period row is hidden when there is no previous period, and the Team Leaderboard is only as tall as its members need ([#96](https://github.com/tolzhabayev/claudestats-app-grafana/issues/96))
- The catalog listing has current screenshots, description and keywords, and the root README points to the docs ([#97](https://github.com/tolzhabayev/claudestats-app-grafana/issues/97))

## 1.1.0

### Added

- **Metric Format setting** — toggle between Prometheus/OTEL Collector and Direct OTLP metric naming conventions in the Configuration page
- End-to-end tests for Metric Format selector

### Fixed

- Stat panels (total cost, tokens, sessions, active users) no longer show "No Data" between sessions — instant counter queries now use `increase([$__range])`
- Plugin loading error ("t() was called before i18n was initialized") resolved by initializing `@grafana/i18n` before scenes renders
- `toolAcceptanceRate` query guarded against division by zero

### Changed

- Updated `@grafana/scenes` from 6.x to 7.x

## 1.0.2

### Changed

- Use `user_email` label instead of `user_account_uuid` for team member identification
- Added `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative` to setup guide (required for Grafana Cloud)
- Improved browser tab titles for better navigation
- Simplified configuration page (removed Team Members tab, users are now identified by email automatically)

### Added

- End-to-end tests with Playwright
- `.nvmrc` file for consistent Node.js version

### CI

- Bump actions/checkout from 5 to 6
- Bump actions/setup-node from 6.0.0 to 6.1.0
- Bump actions/upload-artifact from 5 to 6
- Bump actions/download-artifact from 6 to 7
- Bump grafana/plugin-actions/bundle-size from 1.0.2 to 1.1.0

## 1.0.0

Initial release of Claude Stats Grafana app plugin.

### Features

- Overview dashboard with cost, token, and session metrics
- Cost analytics with breakdown by model and team member
- Token usage analysis with input/output/cache breakdown
- Tool usage tracking with accept/reject decisions
- Productivity metrics (lines of code, commits, PRs)
- Setup wizard for configuring Claude Code OpenTelemetry export
- Team member filtering across all dashboards
- Auto-discovery of Prometheus data sources
