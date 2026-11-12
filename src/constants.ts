import { MetricFormat } from './types';

export const PLUGIN_ID = 'timurdigital-claudestats-app';
export const PLUGIN_BASE_URL = `/a/${PLUGIN_ID}`;

// Route paths
export const ROUTES = {
  Overview: '',
  Costs: 'costs',
  Tokens: 'tokens',
  Tools: 'tools',
  Reliability: 'reliability',
  Traces: 'traces',
  Prompts: 'prompts',
  Workflow: 'workflow',
  Security: 'security',
  Productivity: 'productivity',
} as const;

// Claude Code OpenTelemetry metric names
// Prometheus format: metrics pass through Prometheus/OTEL Collector (adds _total, unit suffixes)
// OTLP format: metrics sent directly via OTLP to Mimir/Grafana Cloud (original names)

export type MetricNames = { [K in keyof typeof METRICS_PROMETHEUS]: string };

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
} as const satisfies MetricNames;

export function getMetrics(format: MetricFormat = 'prometheus'): MetricNames {
  return format === 'otlp' ? METRICS_OTLP : METRICS_PROMETHEUS;
}

/** @deprecated Use getMetrics(format) instead. Kept for backward compatibility. */
export const METRICS = METRICS_PROMETHEUS;

// Label names from OTEL
export const LABELS = {
  // Member identity, in order of preference. `user_email` is only set for sessions signed in
  // with a Claude account; API-key / Bedrock / Vertex / Foundry sessions carry `enduser_id`
  // (when admins set OTEL_RESOURCE_ATTRIBUTES=enduser.id=...) or only the anonymous `user_id`.
  USER_EMAIL: 'user_email',
  ENDUSER_ID: 'enduser_id',
  USER_ID: 'user_id',
  // Label the queries derive from the three above (see withMember in queries.ts).
  MEMBER: 'member',
  MODEL: 'model',
  TOKEN_TYPE: 'type', // input, output, cacheRead, cacheCreation
  LOC_TYPE: 'type', // added, removed
  ACTIVE_TIME_TYPE: 'type', // user (keyboard interaction), cli (tool execution and responses)
  SESSION_ID: 'session_id',
  START_TYPE: 'start_type', // fresh, resume, continue, agents_view
  TOOL: 'tool_name',
  DECISION: 'decision',
  LANGUAGE: 'language', // file language of a code-edit decision (TypeScript, Python, Markdown, ...)
  DECISION_SOURCE: 'source', // config, hook, user_permanent, user_temporary, user_abort, user_reject
  // Attribution labels (what is driving spend)
  QUERY_SOURCE: 'query_source', // main, subagent, auxiliary
  AGENT_NAME: 'agent_name', // subagent; user-defined collapse to "custom"
  SKILL_NAME: 'skill_name', // third-party skills collapse to "third-party"
  MCP_SERVER_NAME: 'mcp_server_name',
  // Repository attributes (OTEL_METRICS_INCLUDE_REPOSITORY=true, Claude Code v2.1.269+)
  REPOSITORY: 'vcs_repository_name',
  MCP_TOOL_NAME: 'mcp_tool_name', // user-configured servers' tools collapse to "custom"
  PLUGIN_NAME: 'plugin_name', // plugin owning the active skill/subagent; third-party → "third-party"
  SPEED: 'speed', // "fast" when fast mode is active; absent on normal requests
  EFFORT: 'effort', // low, medium, high, xhigh, max; absent on models without effort
  // Environment labels
  OS_TYPE: 'os_type',
  OS_VERSION: 'os_version',
  HOST_ARCH: 'host_arch',
  SERVICE_VERSION: 'service_version',
  TERMINAL_TYPE: 'terminal_type',
  ENTRYPOINT: 'app_entrypoint', // cli, vscode, desktop, sdk...; needs OTEL_METRICS_INCLUDE_ENTRYPOINT=true
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
