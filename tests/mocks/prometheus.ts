import type { Page, Route } from '@playwright/test';

/**
 * Synthetic Prometheus data used to drive the e2e tests.
 *
 * The plugin never talks to Prometheus directly - every panel issues a
 * `POST /api/ds/query` through the Grafana datasource proxy, and the template
 * variables resolve their options through the datasource `resources` endpoint
 * (`label_values(...)`, `query_result(...)`). We intercept both at the network layer and return
 * deterministic dataframes, so tests can assert on concrete rendered values
 * without needing real metrics in Prometheus.
 */

// ==================== Shared label dimensions ====================
// Exported so specs can assert on the exact strings the panels should render.

export const MODELS = ['claude-sonnet-4-5', 'claude-opus-4-1'] as const;
export const MEMBERS = ['timur@example.com', 'alex@example.com', 'sam@example.com'] as const;
// An `enduser.id` with quotes and braces, offered only by the Team Member variable, to check
// the option keeps the whole identity.
export const QUOTED_MEMBER = 'Jane "JJ" {Doe}';
export const TOKEN_TYPES = ['input', 'output', 'cacheRead', 'cacheCreation'] as const;
export const LOC_TYPES = ['added', 'removed'] as const;
// `type` label on the active-time metric, and how the panels display it.
export const ACTIVE_TIME_TYPES = { user: 'User (interaction)', cli: 'CLI (processing)' } as const;
export const DECISIONS = ['accept', 'reject'] as const;
// The code-edit decision metric only covers these tools.
export const TOOLS = ['Edit', 'Write', 'NotebookEdit'] as const;
export const LANGUAGES = ['TypeScript', 'Python', 'Markdown'] as const;
// `source` label on the decision metric, and how the Decisions by Source panel displays it.
export const DECISION_SOURCES = {
  config: 'Config rule (auto)',
  hook: 'Hook (auto)',
  user_permanent: 'User: always allow',
  user_temporary: 'User: allow once',
  user_reject: 'User: reject',
  user_abort: 'User: cancel',
} as const;
export const OS_TYPES = ['darwin', 'linux'] as const;
export const HOST_ARCHES = ['arm64', 'x64'] as const;
export const TERMINAL_TYPES = ['vscode', 'iTerm.app'] as const;
export const SERVICE_VERSIONS = ['2.1.322', '2.1.310'] as const;
// Session start types emitted on claude_code_session_count_total.
export const START_TYPES = ['fresh', 'resume', 'continue', 'agents_view'] as const;
// Attribution dimensions (what is driving spend).
export const QUERY_SOURCES = ['main', 'subagent', 'auxiliary'] as const;
export const AGENTS = ['general-purpose', 'custom'] as const;
export const SKILLS = ['code-review', 'third-party'] as const;
export const MCP_SERVERS = ['github', 'filesystem'] as const;
export const PLUGINS = ['code-review', 'third-party'] as const;
// `vcs_repository_name` values (OTEL_METRICS_INCLUDE_REPOSITORY=true).
export const REPOSITORIES = ['claudestats-app-grafana', 'payments-api', 'docs-site'] as const;
// MCP tool bars are labelled `<server> / <tool>`.
export const MCP_TOOLS = [
  { server: 'github', tool: 'create_pull_request' },
  { server: 'github', tool: 'search_code' },
  { server: 'filesystem', tool: 'read_file' },
] as const;
export const mcpToolLabel = (t: { server: string; tool: string }) => `${t.server} / ${t.tool}`;
// `normal` and `default` are the buckets the queries fold absent labels into.
export const SPEEDS = ['normal', 'fast'] as const;
export const EFFORTS = ['high', 'medium', 'default'] as const;

// ==================== One consistent dataset ====================
// A three-person team over one week. Every breakdown sums to its total, so
// panels agree with each other (and screenshots taken from the mocks for the
// docs look like a real team).

type Breakdown = Record<string, number>;

const sum = (b: Breakdown) => Object.values(b).reduce((a, v) => a + v, 0);

// Cost in USD, per member x model (Cost Breakdown table); everything else derives from it.
const COST_TABLE = [
  { user_email: MEMBERS[0], model: MODELS[0], value: 120.4 },
  { user_email: MEMBERS[0], model: MODELS[1], value: 92.0 },
  { user_email: MEMBERS[1], model: MODELS[0], value: 98.85 },
  { user_email: MEMBERS[1], model: MODELS[1], value: 69.5 },
  { user_email: MEMBERS[2], model: MODELS[0], value: 82.5 },
  { user_email: MEMBERS[2], model: MODELS[1], value: 24.0 },
] as const;

const groupCost = (key: 'user_email' | 'model'): Breakdown =>
  COST_TABLE.reduce<Breakdown>((acc, row) => ({ ...acc, [row[key]]: (acc[row[key]] ?? 0) + row.value }), {});

const COST = {
  byMember: groupCost('user_email'),
  byModel: groupCost('model'),
  byQuerySource: { main: 341.05, subagent: 97.45, auxiliary: 48.75 },
  // Subagent attribution covers the `subagent` query source.
  byAgent: { 'general-purpose': 61.2, custom: 36.25 },
  bySkill: { 'code-review': 74.3, 'third-party': 28.1 },
  byMcpServer: { github: 52.4, filesystem: 19.85 },
  // Same MCP spend split per tool (github 52.4, filesystem 19.85).
  byMcpTool: [31.6, 20.8, 19.85],
  byPlugin: { 'code-review': 58.7, 'third-party': 21.4 },
  byRepository: { 'claudestats-app-grafana': 241.3, 'payments-api': 156.45, 'docs-site': 89.5 },
  bySpeed: { normal: 431.0, fast: 56.25 },
  byEffort: { high: 289.5, medium: 151.25, default: 46.5 },
  byOsType: { darwin: 381.25, linux: 106.0 },
  byHostArch: { arm64: 381.25, x64: 106.0 },
  byTerminalType: { vscode: 274.85, 'iTerm.app': 212.4 },
  byServiceVersion: { '2.1.322': 398.75, '2.1.310': 88.5 },
};

const M = 1_000_000;
const TOKENS = {
  byType: { input: 1.24 * M, output: 3.86 * M, cacheRead: 168.9 * M, cacheCreation: 12.42 * M },
  byModel: { [MODELS[0]]: 121.18 * M, [MODELS[1]]: 65.24 * M },
  byMember: { [MEMBERS[0]]: 80.95 * M, [MEMBERS[1]]: 64.37 * M, [MEMBERS[2]]: 41.1 * M },
  byQuerySource: { main: 130.5 * M, subagent: 37.28 * M, auxiliary: 18.64 * M },
  byAgent: { 'general-purpose': 23.4 * M, custom: 13.88 * M },
  bySkill: { 'code-review': 28.6 * M, 'third-party': 10.9 * M },
  byMcpServer: { github: 19.7 * M, filesystem: 7.45 * M },
  byMcpTool: [11.9 * M, 7.8 * M, 7.45 * M],
  byPlugin: { 'code-review': 22.1 * M, 'third-party': 8.3 * M },
  byRepository: { 'claudestats-app-grafana': 92.4 * M, 'payments-api': 60.1 * M, 'docs-site': 33.92 * M },
  bySpeed: { normal: 165.02 * M, fast: 21.4 * M },
  byEffort: { high: 110.8 * M, medium: 57.82 * M, default: 17.8 * M },
};

// `agents_view` launches are excluded from the Sessions total.
const SESSIONS_BY_START_TYPE = { fresh: 34, resume: 15, continue: 9, agents_view: 4 };
const DECISIONS_BY_TYPE = { accept: 438, reject: 146 };
const DECISIONS_BY_TOOL = { Edit: 402, Write: 151, NotebookEdit: 31 };
// Same 584 decisions by who made them: accepts (438) are config/hook/user allows,
// rejects (146) are user rejects and aborts.
const DECISIONS_BY_SOURCE = {
  config: 162,
  hook: 24,
  user_permanent: 97,
  user_temporary: 155,
  user_reject: 118,
  user_abort: 28,
};
// Acceptance rate (%) per file language.
const ACCEPTANCE_RATE_BY_LANGUAGE = { TypeScript: 81.2, Python: 74.5, Markdown: 58.3 };
const LINES_BY_TYPE = { added: 4820, removed: 1960 };
// Same total by model; `unknown` is lines from clients too old to send the label.
const LINES_BY_MODEL = { [MODELS[0]]: 4310, [MODELS[1]]: 2140, unknown: 330 };
// Active time in seconds (20 hours across the team).
const ACTIVE_TIME_BY_MEMBER = { [MEMBERS[0]]: 30600, [MEMBERS[1]]: 25200, [MEMBERS[2]]: 16200 };
// The same 20 hours split into interaction (user) and processing (cli) time.
const ACTIVE_TIME_BY_TYPE = { user: 27000, cli: 45000 };

// Reliability tab (Loki events): API errors, retries and refusals.
export const RELIABILITY = {
  errorsByStatus: { '529': 14, '500': 6, 'No status': 3 },
  errorsByModel: { [MODELS[1]]: 15, [MODELS[0]]: 8 },
  errorsByAttempt: { '11': 9, '3': 8, '1': 6 },
  refusalsByCategory: { cyber: 3, 'Categorized (needs OTEL_LOG_TOOL_DETAILS=1)': 2, 'No category': 1 },
  refusalsByModel: { [MODELS[1]]: 4, [MODELS[0]]: 2 },
  apiErrors: 23,
  errorRate: 1.9,
  retriesExhausted: 9,
  refusals: 6,
};

// Tool performance on the Tools tab (tool_result events in Loki).
export const TOOL_PERFORMANCE = {
  calls: { Bash: 812, Read: 1490, Edit: 402, Grep: 377 },
  failureRate: { Bash: 6.4, Read: 1.2, Edit: 0.7, Grep: 0.3 },
  p50: { Bash: 840, Read: 12, Edit: 35, Grep: 95 },
  p95: { Bash: 14200, Read: 60, Edit: 180, Grep: 610 },
  errorTypes: { ShellError: 41, 'Error:ENOENT': 18, Timeout: 6 },
  p95BySource: { 'Config rule (auto)': 4100, 'User: allow once': 9800, 'User: always allow': 6200 },
};

// Prompts tab (user_prompt events in Loki).
export const PROMPTS = {
  total: 1284,
  commandShare: 18.4,
  perSession: 22.1,
  lengthP50: 186,
  byKind: { 'Typed prompt': 1048, 'Slash command': 236 },
  topCommands: { compact: 96, clear: 61, review: 38, custom: 27, mcp: 14 },
  bySource: { builtin: 195, custom: 27, mcp: 14 },
  lengthBuckets: [412, 437, 151, 48],
};

// Workflow tab (api_request, subagent, compaction, skill, MCP and hook events in Loki).
export const WORKFLOW = {
  requests: { [MODELS[0]]: 6120, [MODELS[1]]: 2380 },
  latencyP50: { [MODELS[0]]: 4200, [MODELS[1]]: 7900 },
  latencyP95: { [MODELS[0]]: 18500, [MODELS[1]]: 31200 },
  latencyByEffort: { high: 29800, medium: 17100, default: 9400 },
  cacheWrites: { '5 minutes': 4.1e6, '1 hour': 8.3e6 },
  subagents: {
    runs: { 'general-purpose': 142, Explore: 96, custom: 31 },
    p95: { 'general-purpose': 214000, Explore: 88000, custom: 141000 },
    toolUses: { 'general-purpose': 18.4, Explore: 11.2, custom: 9.7 },
    background: { 'general-purpose': 22, Explore: 41, custom: 0 },
    switched: { 'general-purpose': 3, Explore: 1, custom: 0 },
  },
  compactions: 47,
  autoShare: 72.3,
  failureRate: 2.1,
  tokensFreed: 118000,
  skills: { 'code-review': 58, custom_skill: 34, 'pdf-export': 12 },
  skillTriggers: { 'claude-proactive': 61, 'user-slash': 39, 'nested-skill': 4 },
  mcpConnections: { connected: 214, disconnected: 198, failed: 9 },
  mcpFailures: { ECONNREFUSED: 6, ETIMEDOUT: 3 },
  hooks: {
    runs: { PreToolUse: 2410, PostToolUse: 2388, Stop: 312 },
    p95: { PreToolUse: 420, PostToolUse: 1260, Stop: 3100 },
    blocking: { PreToolUse: 37, PostToolUse: 0, Stop: 4 },
    errors: { PreToolUse: 2, PostToolUse: 11, Stop: 0 },
  },
};

// Traces tab (Tempo, beta): two interactions and the spans of the first one.
export const TRACES = {
  interactions: [
    { traceID: '4bf92f3577b34da6a3ce929d0e0e4736', durationMs: 41200 },
    { traceID: '00f067aa0ba902b74bf92f3577b34da6', durationMs: 12800 },
  ],
  spans: [
    { spanID: 'a1', parentSpanID: '', operationName: 'claude_code.interaction', start: 0, duration: 41200 },
    { spanID: 'b1', parentSpanID: 'a1', operationName: 'claude_code.llm_request', start: 20, duration: 9600 },
    { spanID: 'c1', parentSpanID: 'a1', operationName: 'claude_code.tool', start: 9700, duration: 24000 },
    {
      spanID: 'c2',
      parentSpanID: 'c1',
      operationName: 'claude_code.tool.blocked_on_user',
      start: 9700,
      duration: 3100,
    },
    { spanID: 'c3', parentSpanID: 'c1', operationName: 'claude_code.tool.execution', start: 12800, duration: 20900 },
    { spanID: 'b2', parentSpanID: 'a1', operationName: 'claude_code.llm_request', start: 33800, duration: 7300 },
  ],
};

// Per-member values for the Team Leaderboard (each column sums to its tab's total).
export const LEADERBOARD = {
  // Unattributed usage (no identity) comes back from the query but isn't listed.
  Cost: { ...COST.byMember, Unattributed: 3.2 } as Record<string, number>,
  Tokens: TOKENS.byMember,
  Sessions: { [MEMBERS[0]]: 26, [MEMBERS[1]]: 19, [MEMBERS[2]]: 13 },
  ActiveTime: ACTIVE_TIME_BY_MEMBER,
  LinesAdded: { [MEMBERS[0]]: 2210, [MEMBERS[1]]: 1640, [MEMBERS[2]]: 970 },
  LinesRemoved: { [MEMBERS[0]]: 880, [MEMBERS[1]]: 690, [MEMBERS[2]]: 390 },
  Commits: { [MEMBERS[0]]: 11, [MEMBERS[1]]: 8, [MEMBERS[2]]: 4 },
  PullRequests: { [MEMBERS[0]]: 3, [MEMBERS[1]]: 2, [MEMBERS[2]]: 1 },
  AcceptanceRate: { [MEMBERS[0]]: 78.4, [MEMBERS[1]]: 73.9, [MEMBERS[2]]: 69.2 },
};

// Scalar values rendered by stat panels.
export const SCALARS = {
  TotalCost: sum(COST.byMember),
  TotalTokens: sum(TOKENS.byType),
  TotalSessions: sum(SESSIONS_BY_START_TYPE) - SESSIONS_BY_START_TYPE.agents_view,
  ActiveUsers: MEMBERS.length,
  InputTokens: TOKENS.byType.input,
  OutputTokens: TOKENS.byType.output,
  CacheReadTokens: TOKENS.byType.cacheRead,
  ToolAcceptanceRate: (DECISIONS_BY_TYPE.accept / sum(DECISIONS_BY_TYPE)) * 100,
  TotalLinesOfCode: sum(LINES_BY_TYPE),
  TotalCommits: 23,
  TotalPullRequests: 6,
  TotalActiveTime: sum(ACTIVE_TIME_BY_MEMBER),
  CacheHitRate:
    (TOKENS.byType.cacheRead / (TOKENS.byType.input + TOKENS.byType.cacheRead + TOKENS.byType.cacheCreation)) * 100,
  CostPerSession: sum(COST.byMember) / (sum(SESSIONS_BY_START_TYPE) - SESSIONS_BY_START_TYPE.agents_view),
  CostPerActiveHour: sum(COST.byMember) / (sum(ACTIVE_TIME_BY_MEMBER) / 3600),
} as const;

// How the stat panels render SCALARS, for spec assertions.
export const DISPLAY = {
  TotalCost: '487',
  TotalTokens: '186',
  TotalSessions: '58',
  ActiveUsers: '3',
  InputTokens: '1.24',
  OutputTokens: '3.86',
  CacheReadTokens: '169',
  ToolAcceptanceRate: '75',
  TotalLinesOfCode: '6.78',
  TotalCommits: '23',
  TotalPullRequests: '6',
  TotalActiveTime: '20',
  CacheHitRate: '92.5%',
  CostPerSession: '$8.40',
  CostPerActiveHour: '$24.36',
} as const;

// ==================== Dataframe builders ====================

type FieldType = 'time' | 'number' | 'string' | 'other';

interface FieldSpec {
  name: string;
  type: FieldType;
  labels?: Record<string, string>;
  // Series name the Prometheus backend sets from a multi-label `legendFormat`.
  displayNameFromDS?: string;
  // Time-field interval (ms) the data source reports, which Grafana uses as the bar width.
  interval?: number;
  values: unknown[];
}

const TYPE_INFO: Record<FieldType, { frame: string }> = {
  time: { frame: 'time.Time' },
  number: { frame: 'float64' },
  string: { frame: 'string' },
  other: { frame: 'json.RawMessage' },
};

function makeFrame(refId: string, fields: FieldSpec[], meta?: Record<string, unknown>) {
  return {
    schema: {
      refId,
      ...(meta ? { meta } : {}),
      fields: fields.map((f) => ({
        name: f.name,
        type: f.type,
        typeInfo: TYPE_INFO[f.type],
        ...(f.labels ? { labels: f.labels } : {}),
        ...(f.displayNameFromDS ? { config: { displayNameFromDS: f.displayNameFromDS } } : {}),
        ...(f.interval ? { config: { interval: f.interval } } : {}),
      })),
    },
    data: { values: fields.map((f) => f.values) },
  };
}

// Relative activity per point across the range: a working week with a quiet weekend.
const ACTIVITY = [1.15, 1.3, 1.2, 1.25, 1.0, 0.35, 0.25, 0.9, 1.1, 1.2, 1.05, 1.15, 0.95, 0.4];

/** Evenly spaced timestamps across the requested range, one per ACTIVITY entry. */
function timeAxis(from: number, to: number): number[] {
  const step = (to - from) / (ACTIVITY.length - 1);
  return ACTIVITY.map((_, i) => Math.round(from + step * i));
}

// A single instant value (stat panels).
function scalarFrame(refId: string, value: number) {
  return [
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [0] },
      { name: 'Value', type: 'number', values: [value] },
    ]),
  ];
}

// One instant value per label (pie charts / bar gauges using `instant: true`).
function instantSeriesFrames(refId: string, labelKey: string, breakdown: Breakdown) {
  return Object.entries(breakdown).map(([label, value]) =>
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [0] },
      { name: 'Value', type: 'number', labels: { [labelKey]: label }, values: [value] },
    ])
  );
}

/**
 * One time series per label (timeseries panels). Each series spreads its total
 * over the range following ACTIVITY, so the points (one `increase()` per
 * interval) add up to the total.
 */
function rangeSeriesFrames(
  refId: string,
  labelKey: string | null,
  breakdown: Breakdown,
  range: { from: number; to: number }
) {
  const times = timeAxis(range.from, range.to);
  const weight = ACTIVITY.reduce((a, v) => a + v, 0);
  return Object.entries(breakdown).map(([label, total], idx) =>
    makeFrame(
      refId,
      [
        { name: 'Time', type: 'time', values: times },
        {
          name: 'Value',
          type: 'number',
          ...(labelKey ? { labels: { [labelKey]: label } } : {}),
          values: ACTIVITY.map((a, i) => {
            // Offset series slightly so they don't move in lockstep.
            const jitter = 1 + 0.12 * Math.sin(i * 1.7 + idx * 2.1);
            return Number(((total * a * jitter) / weight).toFixed(4));
          }),
        },
      ],
      { type: 'timeseries-multi', typeVersion: [0, 1] }
    )
  );
}

// One instant value per MCP tool, labelled with its server and tool name.
function mcpToolFrames(refId: string, values: readonly number[]) {
  return MCP_TOOLS.map((t, i) =>
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [0] },
      {
        name: 'Value',
        type: 'number',
        labels: { mcp_server_name: t.server, mcp_tool_name: t.tool },
        displayNameFromDS: mcpToolLabel(t),
        values: [values[i]],
      },
    ])
  );
}

// Prometheus "table" format: the frontend transform expands the Value field's
// `labels` into columns, so each row must be its own single-value frame with
// the labels attached (NOT separate string columns).
function tableFrame(
  refId: string,
  range: { from: number; to: number },
  rows: ReadonlyArray<{ user_email: string; model: string; value: number }>
) {
  return rows.map((row) =>
    makeFrame(refId, [
      { name: 'Time', type: 'time', values: [range.to] },
      {
        name: 'Value',
        type: 'number',
        labels: { member: row.user_email, model: row.model },
        values: [row.value],
      },
    ])
  );
}

// ==================== refId -> frames ====================

type FrameBuilder = (refId: string, range: { from: number; to: number; step?: number }) => object[];

const DATASET: Record<string, FrameBuilder> = {
  // --- scalars (stat panels) ---
  ...Object.fromEntries(
    Object.entries(SCALARS).map(([refId, value]) => [refId, (id: string) => scalarFrame(id, value)])
  ),

  // --- cost ---
  CostByModel: (id) => instantSeriesFrames(id, 'model', COST.byModel),
  CostByMember: (id) => instantSeriesFrames(id, 'member', COST.byMember),
  CostOverTime: (id, r) => rangeSeriesFrames(id, 'model', COST.byModel, r),
  CostOverTimeByMember: (id, r) => rangeSeriesFrames(id, 'member', COST.byMember, r),
  CostTable: (id, r) => tableFrame(id, r, COST_TABLE),

  // --- cost attribution (sorted bar gauges) ---
  CostByQuerySource: (id) => instantSeriesFrames(id, 'query_source', COST.byQuerySource),
  CostByAgent: (id) => instantSeriesFrames(id, 'agent_name', COST.byAgent),
  CostBySkill: (id) => instantSeriesFrames(id, 'skill_name', COST.bySkill),
  CostByMcpServer: (id) => instantSeriesFrames(id, 'mcp_server_name', COST.byMcpServer),
  CostByMcpTool: (id) => mcpToolFrames(id, COST.byMcpTool),
  CostByPlugin: (id) => instantSeriesFrames(id, 'plugin_name', COST.byPlugin),
  CostByRepository: (id) => instantSeriesFrames(id, 'vcs_repository_name', COST.byRepository),
  CostBySpeed: (id) => instantSeriesFrames(id, 'speed', COST.bySpeed),
  CostByEffort: (id) => instantSeriesFrames(id, 'effort', COST.byEffort),

  // --- tokens ---
  TokensByType: (id) => instantSeriesFrames(id, 'type', TOKENS.byType),
  TokensByModel: (id) => instantSeriesFrames(id, 'model', TOKENS.byModel),
  TokensByMember: (id) => instantSeriesFrames(id, 'member', TOKENS.byMember),
  TokensOverTime: (id, r) => rangeSeriesFrames(id, 'type', TOKENS.byType, r),

  // --- token attribution (sorted bar gauges) ---
  TokensByQuerySource: (id) => instantSeriesFrames(id, 'query_source', TOKENS.byQuerySource),
  TokensByAgent: (id) => instantSeriesFrames(id, 'agent_name', TOKENS.byAgent),
  TokensBySkill: (id) => instantSeriesFrames(id, 'skill_name', TOKENS.bySkill),
  TokensByMcpServer: (id) => instantSeriesFrames(id, 'mcp_server_name', TOKENS.byMcpServer),
  TokensByMcpTool: (id) => mcpToolFrames(id, TOKENS.byMcpTool),
  TokensByPlugin: (id) => instantSeriesFrames(id, 'plugin_name', TOKENS.byPlugin),
  TokensByRepository: (id) => instantSeriesFrames(id, 'vcs_repository_name', TOKENS.byRepository),
  TokensBySpeed: (id) => instantSeriesFrames(id, 'speed', TOKENS.bySpeed),
  TokensByEffort: (id) => instantSeriesFrames(id, 'effort', TOKENS.byEffort),

  // --- sessions / activity (overview) ---
  ActiveTimeOverTime: (id, r) => rangeSeriesFrames(id, 'type', ACTIVE_TIME_BY_TYPE, r),
  SessionsByStartType: (id) => instantSeriesFrames(id, 'start_type', SESSIONS_BY_START_TYPE),

  // --- environment (overview, weighted by cost) ---
  UsageByOsType: (id) => instantSeriesFrames(id, 'os_type', COST.byOsType),
  UsageByHostArch: (id) => instantSeriesFrames(id, 'host_arch', COST.byHostArch),
  UsageByTerminalType: (id) => instantSeriesFrames(id, 'terminal_type', COST.byTerminalType),
  UsageByServiceVersion: (id) => instantSeriesFrames(id, 'service_version', COST.byServiceVersion),

  // --- tools ---
  ToolDecisions: (id) => instantSeriesFrames(id, 'decision', DECISIONS_BY_TYPE),
  ToolDecisionsByTool: (id) => instantSeriesFrames(id, 'tool_name', DECISIONS_BY_TOOL),
  ToolDecisionsOverTime: (id, r) => rangeSeriesFrames(id, 'decision', DECISIONS_BY_TYPE, r),
  ToolDecisionsBySource: (id) => instantSeriesFrames(id, 'source', DECISIONS_BY_SOURCE),
  ToolAcceptanceRateByLanguage: (id) => instantSeriesFrames(id, 'language', ACCEPTANCE_RATE_BY_LANGUAGE),

  // --- productivity ---
  LinesOfCodeByType: (id) => instantSeriesFrames(id, 'type', LINES_BY_TYPE),
  LinesOfCodeByModel: (id) => instantSeriesFrames(id, 'model', LINES_BY_MODEL),
  LinesOfCodeOverTime: (id, r) => rangeSeriesFrames(id, 'type', LINES_BY_TYPE, r),
  CommitsOverTime: (id, r) => rangeSeriesFrames(id, null, { total: SCALARS.TotalCommits }, r),
  PullRequestsOverTime: (id, r) => rangeSeriesFrames(id, null, { total: SCALARS.TotalPullRequests }, r),
  ActiveTimeByType: (id) => instantSeriesFrames(id, 'type', ACTIVE_TIME_BY_TYPE),
  ActiveTimeByMember: (id) => instantSeriesFrames(id, 'member', ACTIVE_TIME_BY_MEMBER),
};

// --- reliability (Loki) ---
// Loki returns instant metric results as `numeric-multi` frames, one per label
// set; the Loki data source frontend relies on that meta to turn them into a table.
function lokiInstantFrames(refId: string, labelKey: string | null, breakdown: Breakdown) {
  return Object.entries(breakdown).map(([label, value]) =>
    makeFrame(
      refId,
      [
        { name: 'Time', type: 'time', values: [0] },
        { name: 'Value', type: 'number', ...(labelKey ? { labels: { [labelKey]: label } } : {}), values: [value] },
      ],
      { type: 'numeric-multi', typeVersion: [0, 1] }
    )
  );
}

// Loki range results have one point per query step. Grafana's Loki data source
// splits long ranges into roughly day-long requests, so each request gets the
// points of its own [from, to] at the requested step, valued by time of day
// (ACTIVITY) so the chunks join into one smooth week.
function lokiRangeFrames(
  refId: string,
  labelKey: string,
  breakdown: Breakdown,
  range: { from: number; to: number; step?: number }
) {
  const step = range.step || 3 * 60 * 60 * 1000;
  const first = Math.ceil(range.from / step) * step;
  const times: number[] = [];
  for (let t = first; t <= range.to; t += step) {
    times.push(t);
  }
  const shapeAt = (t: number) => ACTIVITY[Math.floor(t / (12 * 60 * 60 * 1000)) % ACTIVITY.length];
  return Object.entries(breakdown).map(([label, total], idx) =>
    makeFrame(
      refId,
      [
        { name: 'Time', type: 'time', interval: step, values: times },
        {
          name: 'Value',
          type: 'number',
          labels: { [labelKey]: label },
          values: times.map((t) => Math.round((total / 6) * shapeAt(t) * (1 + 0.6 * Math.sin(t / step + idx * 2)))),
        },
      ],
      { type: 'timeseries-multi', typeVersion: [0, 1] }
    )
  );
}

Object.assign(DATASET, {
  ApiErrors: (id: string) => lokiInstantFrames(id, null, { total: RELIABILITY.apiErrors }),
  ErrorRate: (id: string) => lokiInstantFrames(id, null, { total: RELIABILITY.errorRate }),
  RetriesExhausted: (id: string) => lokiInstantFrames(id, null, { total: RELIABILITY.retriesExhausted }),
  Refusals: (id: string) => lokiInstantFrames(id, null, { total: RELIABILITY.refusals }),
  ApiErrorsOverTime: (id: string, r: { from: number; to: number; step?: number }) =>
    lokiRangeFrames(id, 'status_code', RELIABILITY.errorsByStatus, r),
  ErrorsByModel: (id: string) => lokiInstantFrames(id, 'model', RELIABILITY.errorsByModel),
  ErrorsByAttempt: (id: string) => lokiInstantFrames(id, 'attempt', RELIABILITY.errorsByAttempt),
  RefusalsByCategory: (id: string) => lokiInstantFrames(id, 'category', RELIABILITY.refusalsByCategory),
  RefusalsByModel: (id: string) => lokiInstantFrames(id, 'model', RELIABILITY.refusalsByModel),
  ToolCalls: (id: string) => lokiInstantFrames(id, 'tool_name', TOOL_PERFORMANCE.calls),
  Prompts: (id: string) => lokiInstantFrames(id, null, { total: PROMPTS.total }),
  RequestsByModel: (id: string) => lokiInstantFrames(id, 'model', WORKFLOW.requests),
  RequestLatencyP50: (id: string) => lokiInstantFrames(id, 'model', WORKFLOW.latencyP50),
  RequestLatencyP95: (id: string) => lokiInstantFrames(id, 'model', WORKFLOW.latencyP95),
  RequestLatencyByEffort: (id: string) => lokiInstantFrames(id, 'effort', WORKFLOW.latencyByEffort),
  CacheWrites5m: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.cacheWrites['5 minutes'] }),
  CacheWrites1h: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.cacheWrites['1 hour'] }),
  SubagentRuns: (id: string) => lokiInstantFrames(id, 'agent_type', WORKFLOW.subagents.runs),
  SubagentDurationP95: (id: string) => lokiInstantFrames(id, 'agent_type', WORKFLOW.subagents.p95),
  SubagentToolUses: (id: string) => lokiInstantFrames(id, 'agent_type', WORKFLOW.subagents.toolUses),
  SubagentAsyncShare: (id: string) => lokiInstantFrames(id, 'agent_type', WORKFLOW.subagents.background),
  SubagentModelSwapShare: (id: string) => lokiInstantFrames(id, 'agent_type', WORKFLOW.subagents.switched),
  Compactions: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.compactions }),
  CompactionAutoShare: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.autoShare }),
  CompactionFailureRate: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.failureRate }),
  CompactionTokensReclaimed: (id: string) => lokiInstantFrames(id, null, { total: WORKFLOW.tokensFreed }),
  SkillActivations: (id: string) => lokiInstantFrames(id, 'skill_name', WORKFLOW.skills),
  SkillTriggers: (id: string) => lokiInstantFrames(id, 'invocation_trigger', WORKFLOW.skillTriggers),
  McpConnections: (id: string) => lokiInstantFrames(id, 'status', WORKFLOW.mcpConnections),
  McpFailures: (id: string) => lokiInstantFrames(id, 'error_code', WORKFLOW.mcpFailures),
  HookRuns: (id: string) => lokiInstantFrames(id, 'hook_event', WORKFLOW.hooks.runs),
  HookDurationP95: (id: string) => lokiInstantFrames(id, 'hook_event', WORKFLOW.hooks.p95),
  HookBlocking: (id: string) => lokiInstantFrames(id, 'hook_event', WORKFLOW.hooks.blocking),
  HookErrors: (id: string) => lokiInstantFrames(id, 'hook_event', WORKFLOW.hooks.errors),
  CommandShare: (id: string) => lokiInstantFrames(id, null, { total: PROMPTS.commandShare }),
  PromptsPerSession: (id: string) => lokiInstantFrames(id, null, { total: PROMPTS.perSession }),
  PromptLengthP50: (id: string) => lokiInstantFrames(id, null, { total: PROMPTS.lengthP50 }),
  PromptsOverTime: (id: string, r: { from: number; to: number; step?: number }) =>
    lokiRangeFrames(id, 'kind', PROMPTS.byKind, r),
  TopCommands: (id: string) => lokiInstantFrames(id, 'command_name', PROMPTS.topCommands),
  CommandsBySource: (id: string) => lokiInstantFrames(id, 'command_source', PROMPTS.bySource),
  ...Object.fromEntries(
    PROMPTS.lengthBuckets.map((n, i) => [`PromptLength${i}`, (id: string) => lokiInstantFrames(id, null, { total: n })])
  ),
  ToolFailureRate: (id: string) => lokiInstantFrames(id, 'tool_name', TOOL_PERFORMANCE.failureRate),
  ToolP50: (id: string) => lokiInstantFrames(id, 'tool_name', TOOL_PERFORMANCE.p50),
  ToolP95: (id: string) => lokiInstantFrames(id, 'tool_name', TOOL_PERFORMANCE.p95),
  ToolErrorTypes: (id: string) => lokiInstantFrames(id, 'error_type', TOOL_PERFORMANCE.errorTypes),
  ToolLatencyBySource: (id: string) => lokiInstantFrames(id, 'decision_source', TOOL_PERFORMANCE.p95BySource),
} satisfies Record<string, FrameBuilder>);

// Team Leaderboard columns: one table-format frame per member, labelled with `member`.
for (const [column, byMember] of Object.entries(LEADERBOARD)) {
  DATASET[`Leaderboard${column}`] = (id, r) =>
    Object.entries(byMember).map(([member, value]) =>
      makeFrame(id, [
        { name: 'Time', type: 'time', values: [r.to] },
        { name: 'Value', type: 'number', labels: { member }, values: [value] },
      ])
    );
}

// --- traces (Tempo) ---
// A TraceQL search as a table (one row per trace), and a single trace for the waterfall.
function traceSearchFrame(refId: string, r: { from: number; to: number }) {
  const frame = makeFrame(refId, [
    // Tempo names this field "Trace ID" for display.
    {
      name: 'traceID',
      type: 'string',
      displayNameFromDS: 'Trace ID',
      values: TRACES.interactions.map((t) => t.traceID),
    },
    { name: 'startTime', type: 'time', values: TRACES.interactions.map((_, i) => r.to - (i + 1) * 3600_000) },
    { name: 'traceService', type: 'string', values: TRACES.interactions.map(() => 'claude-code') },
    { name: 'traceName', type: 'string', values: TRACES.interactions.map(() => 'claude_code.interaction') },
    { name: 'traceDuration', type: 'number', values: TRACES.interactions.map((t) => t.durationMs) },
    // Each trace's matching spans; the Tempo frontend expects the column.
    {
      name: 'nested',
      type: 'other',
      // Each trace's matching spans, as Tempo's backend sends them: a "Spans"
      // frame whose fields all carry a config object.
      values: TRACES.interactions.map((t, i) => [
        {
          schema: {
            name: 'Spans',
            meta: { typeVersion: [0, 0], preferredVisualisationType: 'table' },
            fields: [
              {
                name: 'traceIdHidden',
                type: 'string',
                typeInfo: { frame: 'string' },
                config: { custom: { hideFrom: { viz: true } } },
              },
              {
                name: 'spanID',
                type: 'string',
                typeInfo: { frame: 'string' },
                config: { displayNameFromDS: 'Span ID' },
              },
              {
                name: 'time',
                type: 'time',
                typeInfo: { frame: 'time.Time' },
                config: { displayNameFromDS: 'Start time' },
              },
              { name: 'name', type: 'string', typeInfo: { frame: 'string' }, config: { displayNameFromDS: 'Name' } },
              {
                name: 'duration',
                type: 'number',
                typeInfo: { frame: 'float64' },
                config: { displayNameFromDS: 'Duration', unit: 'ns' },
              },
            ],
          },
          data: {
            values: [
              [t.traceID],
              [`root${i}`],
              [r.to - (i + 1) * 3600_000],
              ['claude_code.interaction'],
              [t.durationMs * 1e6],
            ],
          },
        },
      ]),
    },
  ]) as { schema: { name?: string; meta?: Record<string, unknown> } };
  // Shaped like Grafana's Tempo backend response: a "Traces" table frame.
  frame.schema.name = 'Traces';
  frame.schema.meta = { typeVersion: [0, 0], preferredVisualisationType: 'table', uniqueRowIdFields: [0] };
  return [frame];
}

function traceFrame(refId: string, r: { from: number; to: number }) {
  const start = r.to - 3600_000;
  const frame = makeFrame(refId, [
    { name: 'traceID', type: 'string', values: TRACES.spans.map(() => TRACES.interactions[0].traceID) },
    { name: 'spanID', type: 'string', values: TRACES.spans.map((s) => s.spanID) },
    { name: 'parentSpanID', type: 'string', values: TRACES.spans.map((s) => s.parentSpanID) },
    { name: 'operationName', type: 'string', values: TRACES.spans.map((s) => s.operationName) },
    { name: 'serviceName', type: 'string', values: TRACES.spans.map(() => 'claude-code') },
    { name: 'startTime', type: 'number', values: TRACES.spans.map((s) => start + s.start) },
    { name: 'duration', type: 'number', values: TRACES.spans.map((s) => s.duration) },
  ]) as { schema: { meta?: Record<string, unknown> } };
  frame.schema.meta = { preferredVisualisationType: 'trace' };
  return [frame];
}

Object.assign(DATASET, {
  Interactions: traceSearchFrame,
  ModelRequests: traceSearchFrame,
  Trace: traceFrame,
} satisfies Record<string, FrameBuilder>);

// ==================== Route handlers ====================

interface DsQueryBody {
  queries?: Array<{ refId: string; intervalMs?: number }>;
  from?: string;
  to?: string;
}

function buildQueryResponse(body: DsQueryBody, emptyRefIds: readonly string[] = []) {
  const from = Number(body.from) || 0;
  const to = Number(body.to) || from + 3 * 60 * 60 * 1000;
  const results: Record<string, { status: number; frames: object[] }> = {};

  for (const query of body.queries ?? []) {
    if (emptyRefIds.includes(query.refId)) {
      results[query.refId] = { status: 200, frames: [] };
      continue;
    }
    const builder = DATASET[query.refId];
    results[query.refId] = {
      status: 200,
      // Unknown refIds resolve to a NaN scalar frame so missing fixtures are obvious
      // while still returning a valid query response (avoids panel errors).
      frames: builder ? builder(query.refId, { from, to, step: query.intervalMs }) : scalarFrame(query.refId, NaN),
    };
  }

  return { results };
}

function labelValuesResponse(url: string): string[] {
  if (url.includes('/label/model/values')) {
    return [...MODELS];
  }
  if (url.includes('/label/vcs_repository_name/values')) {
    return [...REPOSITORIES];
  }
  return [];
}

/**
 * Makes the given panels return no data, as when Claude Code doesn't send the
 * labels they need. Call after `mockData`; this route takes precedence.
 */
export async function mockEmptyPanels(page: Page, refIds: readonly string[]): Promise<void> {
  await page.route('**/api/ds/query*', async (route: Route) => {
    const body = (route.request().postDataJSON() ?? {}) as DsQueryBody;
    await route.fulfill({ json: buildQueryResponse(body, refIds) });
  });
}

/**
 * Registers Playwright routes that mock all datasource traffic for the plugin.
 * Must be called before navigating to the app so the initial queries are caught.
 */
export async function mockClaudeData(page: Page): Promise<void> {
  // Panel data.
  await page.route('**/api/ds/query*', async (route: Route) => {
    const body = (route.request().postDataJSON() ?? {}) as DsQueryBody;
    await route.fulfill({ json: buildQueryResponse(body) });
  });

  // Template variable options (label_values) and any other resource calls.
  await page.route('**/api/datasources/**/resources/**', async (route: Route) => {
    const url = route.request().url();

    // Team Member variable: `query_result(count by (member) (...))`, run as an
    // instant query. The `{}` group is usage with no identity label, which the
    // variable's regex must leave out.
    if (url.endsWith('/api/v1/query')) {
      await route.fulfill({
        json: {
          status: 'success',
          data: {
            resultType: 'vector',
            result: [
              ...[...MEMBERS, QUOTED_MEMBER].map((member) => ({ metric: { member }, value: [0, '1'] })),
              { metric: {}, value: [0, '1'] },
            ],
          },
        },
      });
      return;
    }

    if (url.includes('/label/') && url.includes('/values')) {
      await route.fulfill({ json: { status: 'success', data: labelValuesResponse(url) } });
      return;
    }

    if (url.includes('/series')) {
      await route.fulfill({
        json: {
          status: 'success',
          data: MEMBERS.flatMap((user_email) =>
            MODELS.map((model) => ({ __name__: 'claude_code_cost_usage_USD_total', user_email, model }))
          ),
        },
      });
      return;
    }

    await route.fulfill({ json: { status: 'success', data: [] } });
  });
}
