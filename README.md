# Claude Stats - Grafana App Plugin

Team usage analytics for Claude Code powered by OpenTelemetry and Grafana Cloud.

## Features

- **Team Overview** - Aggregated usage metrics across all team members
- **Cost Analytics** - Track spending by model and team member
- **Token Usage** - Monitor input/output/cache token consumption
- **Tool Performance** - Analyze tool usage patterns and acceptance rates
- **Productivity Metrics** - Track commits, PRs, and lines of code
- **Filterable by Team Member** - Drill down into individual usage

## Requirements

- Grafana Cloud account (free tier works)
- Claude Code with OpenTelemetry enabled
- Prometheus and Loki data sources (included with Grafana Cloud)

## Quick Start

### 1. Install the Plugin

```bash
# Clone the repository
git clone https://github.com/timurdigital/claudestats-app.git
cd claudestats-app

# Install dependencies
npm install

# Build the plugin
npm run build
```

### 2. Configure Claude Code

Add these environment variables to your shell profile for production:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-<region>.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <your-token>"
```

Add these environment variables to your shell profile for dev:
```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

### 3. Enable the Plugin

1. Go to **Administration → Plugins** in Grafana
2. Find "Claude Stats" and click **Enable**
3. Navigate to the app from the sidebar

## Development

```bash
# Install dependencies
npm install

# Start development server (watches for changes)
npm run dev

# Start Grafana and other services with the plugin
npm run server

# Access Grafana at http://localhost:3000
```

## Architecture

```
Claude Code → OpenTelemetry → Grafana Cloud → Claude Stats App
                               (Mimir/Loki)
```

### Metrics Collected

| Metric | Description |
|--------|-------------|
| `claude_code_session_count_total` | Number of CLI sessions |
| `claude_code_cost_usage_total` | Cost in USD by model |
| `claude_code_token_usage_total` | Tokens by type (input/output/cache) |
| `claude_code_lines_of_code_count_total` | Lines added/removed |
| `claude_code_commit_count_total` | Git commits created |
| `claude_code_pull_request_count_total` | PRs created |
| `claude_code_active_time_total` | Active usage time |

## License

Apache 2.0
