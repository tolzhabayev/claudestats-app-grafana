# Changelog

## 2.0.0

### Breaking changes

- Requires Grafana 13.2.0 or later (was 12.3.0). The plugin now builds on the create-plugin 9 template with React 19 (#56).

### Added

- New tabs built from Claude Code events in Loki (needs `OTEL_LOGS_EXPORTER`):
  - **Reliability**: API errors, exhausted retries and refusals (#35, #80)
  - **Prompts**: prompt volume, slash commands and prompt length (#37, #82)
  - **Workflow**: request latency by model and effort, cache lifetimes, subagents, compaction, skills, MCP connections and hooks (#62, #83)
  - **Security**: permission escalations, auto mode verdicts, rejected tool calls, login failures, plugin installs and managed settings (#63, #84)
- **Traces** tab (beta), built from traces in Tempo: interactions, model requests with time to first token, and a trace waterfall (#38, #87)
- Filters:
  - **Repository** filter, plus pickers for your own labels such as cost center, set on the configuration page (#27, #72)
  - **Team** filter from the identity-provider groups (`user_groups`) of Claude apps gateway sessions (#61, #89)
- Overview:
  - team leaderboard and efficiency ratios (#58, #78)
  - change vs the previous period on the totals (#58, #86)
  - **Surface** donut (needs `OTEL_METRICS_INCLUDE_ENTRYPOINT=true`) (#58, #88)
  - **Sessions by Start Type** donut, based on the `session.count` metric (#32, #43)
- Cost and tokens:
  - by subagent, skill and MCP server (#29, #41)
  - by speed (fast mode) and effort (#30, #42)
  - by plugin and MCP tool (#60, #71)
- Tools tab:
  - acceptance rate by language and decisions by source (#31, #69)
  - tool performance from `tool_result` events (#36, #81)
- Productivity tab:
  - active time split into user and CLI (#33, #66)
  - **Lines of Code by Model** (#34, #68)
- Attribution panels say why they're empty, for example "No subagent ran in this period" (#58, #88)
- Example Grafana alert rules for cost spikes, API error rate, refusals and `bypassPermissions` sessions under `examples/alerting/` (#40, #79, #85)
- Plugin documentation, shown as the **Documentation** tab on the catalog page, including which Claude Code settings each feature needs (#39, #65, #74)

### Changed

- Visual polish: neutral colors, bars per interval on Over Time charts, and panel descriptions (#59, #75)
- Session counts use the `session.count` metric and leave out the local `claude agents` dashboard process (#32, #43)
- The default time range is the last 7 days (#57)

### Fixed

- Usage without `user_email` (API key, Bedrock, Vertex and Foundry users) is attributed to `enduser_id` or `user_id` instead of being dropped (#61, #70)
- The Cache Read stat was always empty (#57)
- The Model picker is hidden on tabs whose metrics have no model label (#57)
- Over Time charts no longer drop counter jumps between bars, and use a 1m minimum step (#76, #77)
- Bar gauges start at zero, so the smallest bar or a single bar is no longer drawn empty (#91)
- The Traces tab no longer shows an error and sends failing Tempo queries before a trace is picked (#93)

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
