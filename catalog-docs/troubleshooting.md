---
title: Troubleshooting
description: 'Troubleshoot common Claude Code Stats setup, data and access errors.'
keywords:
  - 'Claude Code Stats'
  - app
  - troubleshooting
sidebar_position: 8
---

This page explains how to fix common issues when you set up or use Claude Code Stats. For setup instructions, refer to the [Introduction](./index.md).

## Missing data

These issues occur when the app loads but panels show **No data**.

### Every panel shows "No data"

**Symptoms:** All tabs load, but every panel shows **No data**.

**Possible causes and solutions:**

| Cause                                               | Solution                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code isn't exporting telemetry.              | Run `env \| grep -E '(CLAUDE\|OTEL)'` in the team member's shell and check the variables from [Connect your data](./index.md#connect-your-data) are set. Restart Claude Code after you change them.                                                                                                                                                                                                                                  |
| No metrics exported yet.                            | Claude Code exports metrics every 60 seconds by default. Use Claude Code for a few minutes, then reload the app.                                                                                                                                                                                                                                                                                                                     |
| The metric format doesn't match the ingestion path. | Query `claude_code_cost_usage` and `claude_code_cost_usage_USD_total` in **Explore**. If the first returns data, set **Ingestion path** to **Direct OTLP**. If the second does, set it to **Prometheus / OTEL Collector**. For details, refer to [Metric format](./configure.md#metric-format). The default is **Prometheus / OTEL Collector**, so if you followed the **Setup Guide** for Grafana Cloud, switch to **Direct OTLP**. |
| The wrong data source is selected.                  | Pick the data source that receives Claude Code metrics in the **Metrics** control at the top of the tab.                                                                                                                                                                                                                                                                                                                             |
| The time range has no usage.                        | Widen the time range.                                                                                                                                                                                                                                                                                                                                                                                                                |

### No Prometheus data source to select

**Symptoms:** The **Metrics** control has no options.

**Solutions:**

1. Click **Connections** > **Data sources** in the left-side menu.
1. Check for a Prometheus data source. Grafana Cloud stacks include one, connected to Mimir, by default.
1. If there isn't one, add a Prometheus data source that points at the Prometheus or Mimir instance receiving Claude Code metrics.

### Some panels show "No data" or `custom`

**Symptoms:** Totals show data, but some panels are empty or only show `custom` or `third-party`.

**Possible causes and solutions:**

| Cause                                                                                                        | Solution                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing in the period used that feature, such as no subagents, skills, MCP tools, commits or edit decisions. | No action needed. The panel fills in when the feature is used.                                                                               |
| Claude Code redacts user-defined subagent, third-party skill and user-configured MCP server names.           | Set `OTEL_LOG_TOOL_DETAILS=1` for team members. For details, refer to [Optional telemetry settings](./index.md#optional-telemetry-settings). |

### A team member shows as a random ID

**Symptoms:** A team member appears in **Team Member** and the per-member panels as a long random string instead of an email address.

**Solutions:**

Claude Code sends an email address only when the member signs in with a Claude account. With an API key, Amazon Bedrock, Google Cloud or Microsoft Foundry, the app falls back to the anonymous ID Claude Code generates for each machine. Set `enduser.id` for that member to show a readable name, as described in [Name team members who don't sign in with a Claude account](./index.md#name-team-members-who-dont-sign-in-with-a-claude-account). A member who uses several machines appears once per machine until `enduser.id` is set.

## Export errors

These issues occur when Claude Code can't deliver metrics to Grafana Cloud.

### Authentication errors

**Symptoms:** No data arrives, and the OTLP endpoint rejects requests from Claude Code.

**Possible causes and solutions:**

| Cause                                   | Solution                                                                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The credential isn't encoded correctly. | The value after `Authorization=Basic` in `OTEL_EXPORTER_OTLP_HEADERS` must be the Base64 encoding of `<instance-id>:<token>`, not the token alone. Copy it from the headers the Grafana Cloud portal generates. |
| The token can't write OTLP data.        | Generate a token with OTLP write permission from the **OpenTelemetry** tile in the Grafana Cloud portal.                                                                                                        |
| The endpoint is for another region.     | Copy the endpoint from your stack's **OpenTelemetry** tile.                                                                                                                                                     |

## Get more detail about an error

For errors in the app, open the developer tools in your browser and check the console.

## Get additional help

If this page doesn't solve your problem:

- Search the [Grafana community forums](https://community.grafana.com/).
- If your Grafana Cloud or Grafana Enterprise plan includes support, contact Grafana Support.
- Search or open an issue in the [Claude Code Stats issue tracker](https://github.com/tolzhabayev/claudestats-app-grafana/issues).
- For Claude Code telemetry settings, refer to [Monitoring usage](https://code.claude.com/docs/en/monitoring-usage) in the Claude Code docs.

When you report an issue, include:

- The Grafana and plugin versions.
- The error message, with sensitive information removed.
- The steps to reproduce the issue.
- The app page where it happens and the relevant app settings, with credentials removed.
