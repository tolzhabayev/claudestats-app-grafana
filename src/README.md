# Claude Code Stats

Team usage analytics for Claude Code, powered by OpenTelemetry.

Claude Code Stats turns the OpenTelemetry metrics that Claude Code exports into a ready-made Grafana app. See what your team spends, which models and features drive it, and what Claude Code produces, without building dashboards yourself.

## Features

- **Overview:** Total cost, tokens, sessions and active users, with trends and an environment breakdown.
- **Costs:** Spend by model and team member, and what drives it: subagents, skills, plugins, MCP servers and tools, fast mode and effort level.
- **Tokens:** Token volume by type, including prompt cache reads and writes, by model and team member.
- **Tools:** How often team members accept the file edits Claude Code proposes.
- **Productivity:** Lines of code, commits, pull requests and active time.

Filter every tab by team member, repository, your own labels such as team or cost center, and time range, and the cost and token views by model.

## Requirements

- Grafana 13.2.0 or later
- A Prometheus-compatible data source. Grafana Cloud includes one by default.
- Claude Code with telemetry enabled, exporting metrics to Grafana Cloud or through an OpenTelemetry Collector to Prometheus

## Get started

Setup, configuration and a guide to each tab are on the **Documentation** tab of this plugin's page.

For every Claude Code telemetry setting, refer to [Monitoring usage](https://code.claude.com/docs/en/monitoring-usage) in the Claude Code docs.
