---
title: Introduction
description: 'Set up Claude Code Stats and find what to read next in the docs.'
keywords:
  - 'Claude Code Stats'
  - app
  - setup
sidebar_position: 1
---

These docs take you from an installed plugin to a working team usage dashboard. Start with the setup on this page, which gets Claude Code telemetry into Grafana. Then read [Configure](./configure.md) to match the app to how your metrics arrive, and [Features](./features/index.md) for what each tab shows.

## Before you begin

Before you set up the app, ensure you have:

- **Grafana permissions:** The `Organization administrator` role. Only organization administrators can enable and configure apps.
- **Grafana version:** Grafana 13.2.0 or later.
- **A Prometheus-compatible data source:** The app queries Claude Code metrics with PromQL. Grafana Cloud stacks include a Prometheus (Mimir) data source by default. Self-hosted setups can use Prometheus.
- **Claude Code with telemetry enabled:** Each team member's Claude Code must export OpenTelemetry metrics, as described in [Connect your data](#connect-your-data).
- **For the Reliability tab only, a Loki data source:** The **Reliability** tab reads Claude Code events from Loki. Grafana Cloud stacks include a Loki data source by default. For details, refer to [Send events to Loki](#send-events-to-loki).

## Enable the app

<!-- snippet:enable-app -->

To enable Claude Code Stats:

1. Click **Administration** > **Plugins and data** > **Plugins** in the left-side menu.
1. Enter `Claude Code Stats` in the search bar.
1. Select **Claude Code Stats**.
1. Click **Enable**.

<!-- /snippet:enable-app -->

After you enable the app, refer to [Configure](./configure.md) for its settings.

## Connect your data

Claude Code exports usage metrics over OpenTelemetry (OTLP). Choose the path that matches your setup, then set the same **Metric format** in the app, as described in [Configure](./configure.md#metric-format).

### Send metrics directly to Grafana Cloud

To send metrics straight to the Grafana Cloud OTLP endpoint:

1. Open your [Grafana Cloud portal](https://grafana.com/profile/org), select your stack and click **Configure** in the **OpenTelemetry** tile.
1. Click **Generate API Token** and copy the OTLP endpoint and the generated `OTEL_EXPORTER_OTLP_HEADERS` value. The part after `Basic` is the Base64 encoding of your instance ID and token, `<instance-id>:<token>`, not the token alone.
1. Add these variables to each team member's shell profile, such as `~/.zshrc` or `~/.bashrc`:

   ```bash
   export CLAUDE_CODE_ENABLE_TELEMETRY=1
   export OTEL_METRICS_EXPORTER=otlp
   export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-<region>.grafana.net/otlp"
   export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-of-instance-id:token>"
   # Grafana Cloud (Mimir) needs cumulative temporality
   export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
   ```

1. Reload the shell and restart Claude Code.
1. In the app's configuration, set **Ingestion path** to **Direct OTLP**.

The configuration page's **Setup Guide** tab builds this script for you from your endpoint and token. For details, refer to [Setup Guide](./configure.md#setup-guide).

### Send metrics through an OpenTelemetry Collector to Prometheus

To send metrics to a self-hosted OpenTelemetry Collector that writes to Prometheus:

1. Add these variables to each team member's shell profile:

   ```bash
   export CLAUDE_CODE_ENABLE_TELEMETRY=1
   export OTEL_METRICS_EXPORTER=otlp
   export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
   export OTEL_EXPORTER_OTLP_ENDPOINT="http://<collector-host>:4318"
   ```

1. In the Collector, receive OTLP, convert delta temporality to cumulative with the `deltatocumulative` processor and export with `prometheusremotewrite`.
1. Reload the shell and restart Claude Code.
1. In the app's configuration, keep **Ingestion path** set to **Prometheus / OTEL Collector**, which is the default.

### Check that data arrives

Claude Code exports metrics every 60 seconds by default. Use Claude Code for a few minutes, then open **Explore**, select your Prometheus data source and query the cost metric:

| Ingestion path              | Query                              |
| --------------------------- | ---------------------------------- |
| Direct OTLP                 | `claude_code_cost_usage`           |
| Prometheus / OTEL Collector | `claude_code_cost_usage_USD_total` |

When the query returns series, open the app. If it returns nothing, refer to [Troubleshooting](./troubleshooting.md).

### Send events to Loki

The **Reliability** tab reads the events Claude Code sends as OpenTelemetry logs, such as API errors and refusals. To send them:

1. Add this variable to each team member's shell profile, next to the ones above:

   ```bash
   export OTEL_LOGS_EXPORTER=otlp
   ```

   Events go to the same OTLP endpoint as the metrics.

1. Get the events into Loki:
   - **Grafana Cloud:** The OTLP gateway sends logs to your stack's Loki. No other change is needed.
   - **OpenTelemetry Collector:** Add a `logs` pipeline that exports to Loki's OTLP endpoint, such as `http://<loki-host>:3100/otlp`, with the `otlp_http` exporter.

1. Restart Claude Code.

The app expects Loki's native OTLP ingestion, which stores `service.name` as the `service_name` label and the event attributes as structured metadata. On the **Reliability** tab, pick the Loki data source in **Events**.

### Optional telemetry settings

Some panels need an extra Claude Code setting or a minimum Claude Code version. Set the variables in each team member's shell profile, next to the ones above, and restart Claude Code.

| Feature                                                                                                                                             | Requires                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every panel                                                                                                                                         | `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_METRICS_EXPORTER=otlp`, `OTEL_EXPORTER_OTLP_PROTOCOL` and `OTEL_EXPORTER_OTLP_ENDPOINT`, as in [Connect your data](#connect-your-data). `OTEL_EXPORTER_OTLP_PROTOCOL` has no default: without it, Claude Code exports nothing. |
| Real names in **Cost by Subagent**, **Cost by Skill**, **Cost by MCP Server**, **Cost by Plugin**, **Cost by MCP Tool** and their token equivalents | `OTEL_LOG_TOOL_DETAILS=1`, Claude Code v2.1.273 or later. Without it, user-defined subagents, third-party skills and plugins, and user-configured MCP servers and their tools appear as `custom` or `third-party`.                                                     |
| **Repository** filter, **Cost by Repository** and **Tokens by Repository**                                                                          | `OTEL_METRICS_INCLUDE_REPOSITORY=true`, Claude Code v2.1.269 or later. For details, refer to [Filter by repository](#filter-by-repository).                                                                                                                            |
| Your own filters, such as team or cost center                                                                                                       | The attribute in `OTEL_RESOURCE_ATTRIBUTES`, and the label under [Filters](./configure.md#filters). For details, refer to [Filter by your own attributes](#filter-by-your-own-attributes).                                                                             |
| Readable names for team members who use an API key, Amazon Bedrock, Google Cloud or Microsoft Foundry                                               | `enduser.id` in `OTEL_RESOURCE_ATTRIBUTES`. For details, refer to [Name team members who don't sign in with a Claude account](#name-team-members-who-dont-sign-in-with-a-claude-account).                                                                              |
| The **Reliability** tab                                                                                                                             | `OTEL_LOGS_EXPORTER=otlp` and a Loki data source. For details, refer to [Send events to Loki](#send-events-to-loki).                                                                                                                                                   |
| **Lines of Code by Model**                                                                                                                          | Claude Code v2.1.172 or later. Lines from older versions appear as `unknown`.                                                                                                                                                                                          |

#### Filter by repository

Set `OTEL_METRICS_INCLUDE_REPOSITORY=true` (Claude Code v2.1.269 and later) to tag metrics with the Git repository Claude Code works in, taken from its `origin` remote. The app then shows a **Repository** filter and the **Cost by Repository** and **Tokens by Repository** panels.

#### Filter by your own attributes

Attributes in `OTEL_RESOURCE_ATTRIBUTES`, such as `team.id=platform` or `cost_center=eng-42`, reach Prometheus as labels on every metric, with dots turned into underscores. To filter by one, add it under [Filters](./configure.md#filters) on the configuration page.

#### Name team members who don't sign in with a Claude account

The app names each team member by the email address of their Claude account. Sessions that use an API key, Amazon Bedrock, Google Cloud or Microsoft Foundry don't send an email, so the app falls back to the anonymous ID Claude Code generates for each machine, a long random string. To show a readable name instead, set `enduser.id` in each team member's shell profile:

```bash
export OTEL_RESOURCE_ATTRIBUTES="enduser.id=jdoe@example.com"
```

If `OTEL_RESOURCE_ATTRIBUTES` is already set, add `enduser.id=...` to it, separated by a comma. An email address from a Claude account takes precedence over `enduser.id`.

For every Claude Code telemetry setting, refer to [Monitoring usage](https://code.claude.com/docs/en/monitoring-usage) in the Claude Code docs.

## Common tasks

- [Match the app to how your metrics arrive](./configure.md#metric-format)
- [See what your team spends and on which models](./features/costs.md)
- [Find what drives token usage](./features/tokens.md)
- [Check how often Claude's edits are accepted](./features/tools.md)
- [Track commits, pull requests and active time](./features/productivity.md)
- [Get alerted when a team member's spend spikes](./configure.md#set-up-alerts)
- [Fix panels that show no data](./troubleshooting.md)
