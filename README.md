# Claude Stats - Grafana App Plugin

Team usage analytics for Claude Code powered by OpenTelemetry and Grafana.

## Features

- **Team Overview** - Aggregated usage metrics across all team members
- **Cost Analytics** - Track spending by model and team member
- **Token Usage** - Monitor input/output/cache token consumption
- **Tool Performance** - Analyze tool usage patterns and acceptance rates
- **Productivity Metrics** - Track commits, PRs, and lines of code
- **Filterable by Team Member** - Drill down into individual usage

## Requirements

- Grafana Cloud account (free tier works) or self-hosted Grafana
- Claude Code with OpenTelemetry enabled
- Prometheus-compatible data source (Mimir is included with Grafana Cloud)

## Quick Start

### 1. Install the Plugin

```bash
git clone https://github.com/timurdigital/claudestats-app.git
cd claudestats-app
npm install
npm run build
```

### 2. Configure Claude Code

#### Option A: Direct OTLP to Grafana Cloud (recommended)

Send metrics directly to Grafana Cloud's OTLP endpoint:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-<region>.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <your-token>"
# Required for Grafana Cloud (Mimir) compatibility
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
```

#### Option B: Via OTEL Collector → Prometheus (self-hosted)

Send metrics through an OTEL Collector that writes to Prometheus:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

### 3. Enable the Plugin

1. Go to **Administration → Plugins** in Grafana
2. Find "Claude Stats" and click **Enable**
3. Go to the plugin **Configuration** tab
4. Select the **Metric Format** matching your ingestion path (see below)
5. Navigate to the app from the sidebar

## Metric Format Setting

Claude Code metric names differ depending on how metrics reach Grafana:

| Ingestion path | Example metric name |
|---|---|
| Direct OTLP → Mimir/Grafana Cloud | `claude_code_cost_usage` |
| OTEL Collector → Prometheus | `claude_code_cost_usage_USD_total` |

Go to **Administration → Plugins → Claude Stats → Configuration** and select the format that matches your setup. The default is **Prometheus / OTEL Collector**.

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

**Direct OTLP (Grafana Cloud):**
```
Claude Code → OTLP → Grafana Cloud (Mimir) → Claude Stats App
```

**Via Collector (self-hosted):**
```
Claude Code → OTLP → OTEL Collector → Prometheus → Claude Stats App
                        (delta→cumulative)
```

### Metrics Collected

| Metric (Prometheus format) | Metric (OTLP format) | Description |
|---|---|---|
| `claude_code_session_count_total` | `claude_code_session_count` | Number of CLI sessions |
| `claude_code_cost_usage_USD_total` | `claude_code_cost_usage` | Cost in USD by model |
| `claude_code_token_usage_tokens_total` | `claude_code_token_usage` | Tokens by type (input/output/cache) |
| `claude_code_lines_of_code_count_total` | `claude_code_lines_of_code_count` | Lines added/removed |
| `claude_code_commit_count_total` | `claude_code_commit_count` | Git commits created |
| `claude_code_pull_request_count_total` | `claude_code_pull_request_count` | PRs created |
| `claude_code_active_time_seconds_total` | `claude_code_active_time_total` | Active usage time |
| `claude_code_code_edit_tool_decision_total` | `claude_code_code_edit_tool_decision` | Tool accept/reject decisions |

## License

Apache 2.0
