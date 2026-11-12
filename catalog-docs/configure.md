---
title: Configure
description: 'Change the Claude Code Stats settings in Grafana or provision them as code.'
keywords:
  - 'Claude Code Stats'
  - app
  - configuration
  - provisioning
sidebar_position: 2
---

This document explains how to configure Claude Code Stats after you enable it, and how to set up the recommended alert rule.

## Before you begin

Before you configure the app, ensure you have:

- **Grafana permissions:** The `Organization administrator` role. Only organization administrators can configure apps.
- **The app enabled:** Follow [Enable the app](./index.md#enable-the-app).

## Open the configuration page

<!-- snippet:open-app-config -->

To open the Claude Code Stats configuration page:

1. Click **Administration** > **Plugins and data** > **Plugins** in the left-side menu.
1. Enter `Claude Code Stats` in the search bar.
1. Select **Claude Code Stats**.

<!-- /snippet:open-app-config -->

Then click the **Configuration** tab.

## Configure settings

The configuration page has two settings, the metric format and the filter labels, plus a status section and two help tabs. The **Metric Format** and **Filters** sections and the tabs appear only while the app is enabled.

### Plugin status

The **Plugin Status** section shows whether the app is enabled:

| Button             | Description                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Enable Plugin**  | Shown while the app is disabled. Enables the app, pins it to the navigation and saves the current metric format. |
| **Disable Plugin** | Shown while the app is enabled. Disables the app and unpins it.                                                  |

Both buttons save immediately and reload the page.

### Metric format

The **Metric Format** section sets how the app names metrics in its queries. Pick the option that matches how Claude Code metrics reach your data source:

![The Ingestion path setting with the Prometheus / OTEL Collector and Direct OTLP options](img/configure.webp)

| Setting            | Description                                                                                                                                                                                                                                                                                                                                      | Required |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **Ingestion path** | **Prometheus / OTEL Collector** (default): metrics pass through an OpenTelemetry Collector into Prometheus, which adds `_total` and unit suffixes, such as `claude_code_cost_usage_USD_total`. **Direct OTLP**: metrics go straight to the Grafana Cloud or Mimir OTLP endpoint and keep their original names, such as `claude_code_cost_usage`. | Yes      |

Picking an option saves the setting and reloads the page. If the format doesn't match your ingestion path, every panel shows no data.

### Filters

The **Filters** section adds a filter above the panels for each label you list, so you can slice every tab by a team, cost center or any other attribute your team members send:

| Setting           | Description                                                                                                                                                                                                                                                                              | Required |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Filter labels** | Attribute names, such as `team.id`, or the Prometheus labels they become, such as `team_id`. Type a name and press Enter. Labels the app already filters by, such as `model` and `user_email`, and names with other characters than letters, digits, dots and underscores can't be used. | No       |

Click **Save filters** to save the list and reload the page. Each filter's picker is named after the label as you entered it, applies to every panel and defaults to **All**. A repository filter is built in and doesn't need to be listed. For how team members set attributes, refer to [Filter by your own attributes](./index.md#filter-by-your-own-attributes).

### Setup Guide

The **Setup Guide** tab builds the Claude Code environment variables for sending metrics directly to Grafana Cloud:

| Setting                | Description                                                                                                                                                                            | Required |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **OTLP Endpoint**      | Your Grafana Cloud OTLP endpoint, such as `https://otlp-gateway-prod-us-east-0.grafana.net/otlp`.                                                                                      | No       |
| **API Token (Base64)** | The Base64 encoding of `<instance-id>:<token>`: the value after `Basic` in the `OTEL_EXPORTER_OTLP_HEADERS` the Grafana Cloud portal generates. The token alone fails to authenticate. | No       |

These fields only fill in the script shown below them. The app doesn't save them. Click **Copy Script** to copy the script, add it to your shell profile and restart Claude Code. When you use this path, set **Ingestion path** to **Direct OTLP**.

### Troubleshooting

The **Troubleshooting** tab lists checks for missing data, authentication errors and a missing data source, and the metric names for each ingestion path. The same checks are in [Troubleshooting](./troubleshooting.md).

## Provision the app

You can provision Claude Code Stats as code with a Grafana provisioning file. For more information, refer to [Provision Grafana](https://grafana.com/docs/grafana/latest/administration/provisioning/#plugins).

```yaml
apiVersion: 1

apps:
  - type: timurdigital-claudestats-app
    org_id: 1
    disabled: false
    jsonData:
      metricFormat: otlp
      customLabels:
        - team.id
```

| Key                     | What it sets                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org_id`                | The organization to enable the app in.                                                                                                                    |
| `disabled`              | Set to `false` to enable the app.                                                                                                                         |
| `jsonData.metricFormat` | The **Ingestion path**: `prometheus` for **Prometheus / OTEL Collector** or `otlp` for **Direct OTLP**. When you leave it out, the app uses `prometheus`. |
| `jsonData.customLabels` | The **Filter labels**, as a list.                                                                                                                         |

The app has no secure settings, so it doesn't use `secureJsonData`.

## Set up alerts

The plugin repository includes a recommended alert rule as a Grafana provisioning file, [`examples/alerting/claude-code-alerts.yaml`](https://github.com/tolzhabayev/claudestats-app-grafana/blob/main/examples/alerting/claude-code-alerts.yaml). It adds the rule to a **Claude Code** folder:

| Alert rule                            | Fires when                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Code cost spike per member** | A team member's estimated spend in the last hour is over $5 and more than 3 times their average hourly spend over the last 7 days. It's checked every 5 minutes. |

Team members are identified the same way as in the app: by email address, else `enduser.id`, else the anonymous Claude Code user ID.

To add the rule:

1. Copy the file into the `provisioning/alerting` directory of your Grafana server.
1. Set `datasourceUid` to the UID of the Prometheus data source that has your Claude Code metrics. It's the last part of the URL when you open the data source under **Connections** > **Data sources**.
1. If **Ingestion path** is **Direct OTLP**, replace `claude_code_cost_usage_USD_total` with `claude_code_cost_usage` in the query.
1. Change the thresholds in the query if $5 or 3 times don't fit your team.
1. Restart Grafana.

Alerts go to your default contact point. For more information, refer to [Provision alert rules](https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/).
