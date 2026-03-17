export const PLUGIN_ID = 'timurdigital-claudestats-app';
export const PLUGIN_BASE_URL = `/a/${PLUGIN_ID}`;

// Route paths
export const ROUTES = {
  Overview: '',
  Costs: 'costs',
  Tokens: 'tokens',
  Tools: 'tools',
  Productivity: 'productivity',
} as const;

import { MetricFormat } from './types';

// Claude Code OpenTelemetry metric names
// Prometheus format: metrics pass through Prometheus/OTEL Collector (adds _total, unit suffixes)
// OTLP format: metrics sent directly via OTLP to Mimir/Grafana Cloud (original names)

export type MetricNames = typeof METRICS_PROMETHEUS;

const METRICS_PROMETHEUS = {
  SESSION_COUNT: 'claude_code_session_count_total',
  LINES_OF_CODE: 'claude_code_lines_of_code_count_total',
  PULL_REQUESTS: 'claude_code_pull_request_count_total',
  COMMITS: 'claude_code_commit_count_total',
  COST_USAGE: 'claude_code_cost_usage_USD_total',
  TOKEN_USAGE: 'claude_code_token_usage_tokens_total',
  TOOL_DECISION: 'claude_code_code_edit_tool_decision_total',
  ACTIVE_TIME: 'claude_code_active_time_seconds_total',
} as const;

const METRICS_OTLP = {
  SESSION_COUNT: 'claude_code_session_count',
  LINES_OF_CODE: 'claude_code_lines_of_code_count',
  PULL_REQUESTS: 'claude_code_pull_request_count',
  COMMITS: 'claude_code_commit_count',
  COST_USAGE: 'claude_code_cost_usage',
  TOKEN_USAGE: 'claude_code_token_usage',
  TOOL_DECISION: 'claude_code_code_edit_tool_decision',
  ACTIVE_TIME: 'claude_code_active_time_total',
} as const;

export function getMetrics(format: MetricFormat = 'prometheus'): MetricNames {
  return format === 'otlp' ? METRICS_OTLP : METRICS_PROMETHEUS;
}

/** @deprecated Use getMetrics(format) instead. Kept for backward compatibility. */
export const METRICS = METRICS_PROMETHEUS;

// Label names from OTEL
export const LABELS = {
  USER_EMAIL: 'user_email',
  MODEL: 'model',
  TOKEN_TYPE: 'type', // input, output, cache_read, cache_creation
  LOC_TYPE: 'type', // added, removed
  SESSION_ID: 'session_id',
  TOOL: 'tool_name',
  DECISION: 'decision',
  // Environment labels
  OS_TYPE: 'os_type',
  OS_VERSION: 'os_version',
  HOST_ARCH: 'host_arch',
  SERVICE_VERSION: 'service_version',
  TERMINAL_TYPE: 'terminal_type',
} as const;

// Default time ranges
export const TIME_RANGES = {
  LAST_HOUR: 'now-1h',
  LAST_24H: 'now-24h',
  LAST_7D: 'now-7d',
  LAST_30D: 'now-30d',
} as const;

// Panel sizes
export const PANEL_HEIGHTS = {
  STAT: 100,
  MEDIUM: 200,
  LARGE: 300,
  TABLE: 250,
} as const;
