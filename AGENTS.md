# Claude Stats - Grafana App Plugin

## Overview

Claude Stats is a Grafana app plugin that provides team visibility into Claude Code usage metrics. It leverages Claude Code's built-in OpenTelemetry support to collect and visualize usage data in Grafana.

## Architecture

### Data Flow

**Grafana Cloud (recommended):**
```
Claude Code → OTLP Export → Grafana Cloud (Mimir) → This App
     ↓              ↓                ↓
  Metrics      Cumulative       Grafana Scenes
```

**Self-hosted (requires collector):**
```
Claude Code → OTLP Export → OTEL Collector → Prometheus → This App
     ↓              ↓              ↓              ↓
  Metrics      HTTP/Protobuf   Delta→Cumulative  Grafana Scenes
```

### Technology Stack

- **Frontend**: React with Grafana Scenes framework
- **Data Sources**: Prometheus (or Mimir) for metrics
- **Package Manager**: npm
- **Build Tool**: Webpack (via @grafana/plugin-tools)
- **Target Platform**: Grafana Cloud (v12.3.0+) or self-hosted Grafana

### Key Dependencies

- `@grafana/scenes` - Scene-based UI framework
- `@grafana/data`, `@grafana/ui`, `@grafana/runtime` - Grafana frontend libraries
- `react-router-dom` v6 - Routing

## Project Structure

```
src/
├── components/
│   ├── App.tsx              # Main router component
│   ├── AppConfig.tsx        # Plugin configuration page (setup guide, troubleshooting)
│   └── scenes/
│       └── SceneAppPage.tsx # Main Scenes app with tab navigation
├── scenes/
│   ├── queries.ts           # PromQL query definitions
│   ├── variables.ts         # Shared scene variables (datasource, filters)
│   └── pages/
│       ├── OverviewScene.ts   # Overview dashboard scene
│       ├── CostsScene.ts      # Cost analytics scene
│       ├── TokensScene.ts     # Token usage scene
│       ├── ToolsScene.ts      # Tool usage scene
│       └── ProductivityScene.ts # Productivity metrics scene
├── types.ts                 # TypeScript types
├── constants.ts             # Metric names, labels, routes
├── module.ts                # Plugin entry point
└── plugin.json              # Plugin metadata
```

## Implemented Features

### Dashboard Scenes

1. **Overview** - High-level stats (total cost, tokens, sessions, active users) with cost and token trend charts
2. **Costs** - Cost breakdown by model and team member, daily trends, cost distribution pie charts, detailed table
3. **Tokens** - Token usage by type (input/output/cache_read/cache_creation), model distribution, usage over time
4. **Tools** - Tool acceptance rate, tool decisions (accept/reject), usage by tool name, decisions over time
5. **Productivity** - Lines of code (added/removed), commits, pull requests, active time by team member

### Configuration Page

All setup and configuration is consolidated in the plugin Configuration page (Administration > Plugins > Claude Stats > Configuration):

- **Setup Guide tab**: Step-by-step instructions for configuring Claude Code OpenTelemetry export with credential input and generated shell script
- **Troubleshooting tab**: Common issues, metrics reference, documentation links

### Team Filtering

- QueryVariable for filtering by `user_email` (team members identified by email address)
- QueryVariable for filtering by `model`
- All scenes support filtering to individual team members or models
- "All" option for aggregate views

### Data Source Discovery

- DataSourceVariable for Prometheus auto-discovery
- Supports multiple Prometheus-compatible data sources

## Claude Code Metrics Reference

These metrics are exported by Claude Code when OTLP is enabled. Note that OTEL adds unit suffixes to metric names:

| Metric | Description |
|--------|-------------|
| `claude_code_session_count_total` | Number of Claude Code sessions |
| `claude_code_cost_usage_USD_total` | API costs in USD |
| `claude_code_token_usage_tokens_total` | Token consumption by type |
| `claude_code_lines_of_code_count_total` | Lines added/removed |
| `claude_code_commit_count_total` | Git commits made |
| `claude_code_pull_request_count_total` | Pull requests created |
| `claude_code_active_time_seconds_total` | Active coding time in seconds |
| `claude_code_code_edit_tool_decision_total` | Tool accept/reject decisions |

### Labels

- `user_email` - User's email address (primary identifier for team members)
- `user_account_uuid` - Anonymized user identifier (for privacy-sensitive deployments)
- `model` - Claude model used (e.g., claude-sonnet-4-20250514, claude-opus-4-5-20250514)
- `type` - Token type (input, output, cache_read, cache_creation) or LOC type (added, removed)
- `session_id` - Unique session identifier
- `tool_name` - Tool name for tool decision metrics (e.g., Edit, Write, Bash)
- `decision` - Tool decision value (accept, reject)

## Development

### Local Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Local Observability Stack

The project includes a Docker Compose setup for local development with real Claude Code telemetry:

```bash
docker-compose up -d
# Access Grafana at http://localhost:3000
```

This starts:
- **Grafana** (port 3000) - With the plugin pre-installed
- **Prometheus** (port 9090) - With remote write receiver enabled
- **OTEL Collector** (ports 4317/4318) - Converts delta metrics to cumulative

### Environment Variables (for Claude Code)

Configure Claude Code to send telemetry (metrics only, no logs):

**Local Development Stack:**

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_METRIC_EXPORT_INTERVAL=10000
# Note: OTEL_LOGS_EXPORTER is intentionally not set (no logs)
```

**Grafana Cloud:**

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp-gateway-prod-<region>.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic <base64-encoded-instance:token>"
# IMPORTANT: Use cumulative temporality for Grafana Cloud compatibility
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative
# Note: OTEL_LOGS_EXPORTER is intentionally not set (no logs)
```

### Claude Code Telemetry Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Enable telemetry (required) | `1` |
| `OTEL_METRICS_EXPORTER` | Metrics exporter type | `otlp`, `prometheus`, `console` |
| `OTEL_LOGS_EXPORTER` | Logs exporter (omit for metrics-only) | `otlp`, `console` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP protocol | `grpc`, `http/json`, `http/protobuf` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector endpoint | `http://localhost:4318` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Auth headers | `Authorization=Bearer token` |
| `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE` | Metrics temporality (required for Grafana Cloud) | `cumulative` |
| `OTEL_METRIC_EXPORT_INTERVAL` | Export interval (ms) | `10000` (default: 60000) |

**Cardinality Control:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_METRICS_INCLUDE_SESSION_ID` | `true` | Include session_id in metrics |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | `true` | Include user_account_uuid in metrics |

**Multi-Team Support:**

```bash
export OTEL_RESOURCE_ATTRIBUTES="department=engineering,team.id=platform"
```

For full documentation, see: https://code.claude.com/docs/en/monitoring-usage

### OTEL Collector Configuration

The collector config (`otel-collector-config.yaml`) includes:
- OTLP receiver on ports 4317 (gRPC) and 4318 (HTTP)
- `deltatocumulative` processor to convert Claude Code's delta temporality metrics
- Prometheus remote write exporter

## Configuration Notes

### Required Data Sources

- **Prometheus** (or Mimir) - For metrics queries

### Grafana Cloud Setup

The app works with Grafana Cloud which provides:
- Pre-configured Prometheus (Mimir) data source
- OTLP ingestion endpoint for Claude Code telemetry
- Free tier sufficient for most team usage tracking

### Self-Hosted Setup

For self-hosted Grafana:
1. Deploy OTEL Collector with `deltatocumulative` processor
2. Configure Prometheus with remote write receiver
3. Install this plugin in Grafana
4. Configure Claude Code to send telemetry to OTEL Collector

## Contributing

When adding new features:

1. Add new metrics to `src/constants.ts`
2. Define queries in `src/scenes/queries.ts`
3. Create or update scene in `src/scenes/pages/`
4. Update this AGENTS.md with implementation details
