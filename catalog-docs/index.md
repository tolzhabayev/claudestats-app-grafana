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

### Optional telemetry settings

The attribution panels need an extra Claude Code setting to show real names:

| Panel                                                                                                                                 | Claude Code setting                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cost by Subagent**, **Cost by Skill**, **Cost by MCP Server**, **Cost by Plugin**, **Cost by MCP Tool** and their token equivalents | `OTEL_LOG_TOOL_DETAILS=1` shows the real names of user-defined subagents, third-party skills and plugins, and user-configured MCP servers and their tools. Without it, those appear as `custom` or `third-party`. |

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
- [Fix panels that show no data](./troubleshooting.md)
