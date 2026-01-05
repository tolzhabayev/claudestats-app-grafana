# Claude Code Stats

Team usage analytics for Claude Code powered by OpenTelemetry.

## Requirements

- Grafana 12.3.0 or later
- A Prometheus-compatible data source (Grafana Cloud includes this by default)
- Claude Code with telemetry enabled

## Installation

Install the plugin through the Grafana UI:
https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/#install-a-plugin-through-the-grafana-ui

## Configuration

### Step 1: Get Grafana Cloud OTLP Credentials

1. Go to your [Grafana Cloud Portal](https://grafana.com/profile/org)
2. Select your stack and click **Configure** in the OpenTelemetry tile
3. Click **Generate API Token**
4. Copy the OTLP endpoint and token

### Step 2: Configure Environment Variables

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`):

```bash
# Enable Claude Code telemetry
export CLAUDE_CODE_ENABLE_TELEMETRY=1

# Configure OpenTelemetry metrics exporter
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"

# Grafana Cloud OTLP endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-<region>.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <your-base64-encoded-token>"

# Optional: Adjust export interval (in milliseconds, default: 60000)
export OTEL_METRIC_EXPORT_INTERVAL=60000
```

Replace `<region>` with your Grafana Cloud region and `<your-base64-encoded-token>` with your API token.

### Step 3: Restart Claude Code

```bash
# Reload your shell config
source ~/.zshrc  # or ~/.bashrc

# Start Claude Code - telemetry will now be enabled
claude
```

## Features

- **Overview**: Total cost, tokens, sessions, and active users
- **Costs**: Cost breakdown by model, team member, and time
- **Tokens**: Token usage by type (input, output, cache)
- **Tools**: Tool acceptance rates and usage
- **Productivity**: Lines of code, commits, and active time
- **Environment**: OS, architecture, and Claude Code version distribution

## Team Member Names

By default, team members are identified by their UUID. To display names instead:

1. Go to **Administration > Plugins > Claude Code Stats > Configuration**
2. Select the **Team Members** tab
3. Add mappings in the format: `UUID|Display Name`

## Documentation

For full telemetry documentation, see the [Claude Code Monitoring Usage Guide](https://docs.anthropic.com/en/docs/claude-code/monitoring-usage).
