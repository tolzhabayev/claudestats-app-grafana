import { METRICS, LABELS, MetricNames } from '../constants';

/**
 * PromQL query builders for Claude Code metrics
 * All queries support filtering by team member ($member) and model ($model)
 */

function buildQueries(m: MetricNames) {
  return {
    // ==================== COST QUERIES ====================

    /** Total cost across all users/models (instant) */
    totalCost: `sum(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]))`,

    /** Cost breakdown by model */
    costByModel: `sum by (${LABELS.MODEL}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Cost breakdown by team member */
    costByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.COST_USAGE}{${LABELS.MODEL}=~"$model"}[$__range]))`,

    /** Cost over time (rate) */
    costOverTime: `sum(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.MODEL})`,

    /** Cost over time by member */
    costOverTimeByMember: `sum(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.USER_EMAIL})`,

    /** Cost table breakdown by member and model */
    costTable: `sum by (${LABELS.USER_EMAIL}, ${LABELS.MODEL}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]))`,

    // ---- Cost attribution (what is driving spend) ----
    // sort_desc so the bar gauges render biggest spender first.

    /** Cost by query source (main, subagent, auxiliary) */
    costByQuerySource: `sort_desc(sum by (${LABELS.QUERY_SOURCE}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range])))`,

    /** Cost by subagent (agent_name); only series that carry the label */
    costByAgent: `sort_desc(sum by (${LABELS.AGENT_NAME}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.AGENT_NAME}=~".+"}[$__range])))`,

    /** Cost by skill; only series that carry the label */
    costBySkill: `sort_desc(sum by (${LABELS.SKILL_NAME}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.SKILL_NAME}=~".+"}[$__range])))`,

    /** Cost by MCP server; only series that carry the label */
    costByMcpServer: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.MCP_SERVER_NAME}=~".+"}[$__range])))`,

    /** Cost by speed; absent label (normal requests) folds into the "normal" bucket */
    costBySpeed: `sort_desc(sum by (${LABELS.SPEED}) (label_replace(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]), "${LABELS.SPEED}", "normal", "${LABELS.SPEED}", "^$")))`,

    /** Cost by effort; absent label (models without effort) folds into the "default" bucket */
    costByEffort: `sort_desc(sum by (${LABELS.EFFORT}) (label_replace(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]), "${LABELS.EFFORT}", "default", "${LABELS.EFFORT}", "^$")))`,

    // ==================== TOKEN QUERIES ====================

    /** Total tokens (all types) */
    totalTokens: `sum(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]))`,

    /** Input tokens */
    inputTokens: `sum(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="input"}[$__range]))`,

    /** Output tokens */
    outputTokens: `sum(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="output"}[$__range]))`,

    /** Cache read tokens */
    cacheReadTokens: `sum(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="cacheRead"}[$__range]))`,

    /** Tokens by type (input, output, cacheRead, cacheCreation) */
    tokensByType: `sum by (${LABELS.TOKEN_TYPE}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]))`,

    /** Tokens by model */
    tokensByModel: `sum by (${LABELS.MODEL}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Tokens over time */
    tokensOverTime: `sum(rate(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.TOKEN_TYPE})`,

    /** Tokens by member */
    tokensByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.TOKEN_USAGE}{${LABELS.MODEL}=~"$model"}[$__range]))`,

    // ---- Token attribution (what is driving usage) ----
    // sort_desc so the bar gauges render biggest consumer first.

    /** Tokens by query source (main, subagent, auxiliary) */
    tokensByQuerySource: `sort_desc(sum by (${LABELS.QUERY_SOURCE}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range])))`,

    /** Tokens by subagent (agent_name); only series that carry the label */
    tokensByAgent: `sort_desc(sum by (${LABELS.AGENT_NAME}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.AGENT_NAME}=~".+"}[$__range])))`,

    /** Tokens by skill; only series that carry the label */
    tokensBySkill: `sort_desc(sum by (${LABELS.SKILL_NAME}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.SKILL_NAME}=~".+"}[$__range])))`,

    /** Tokens by MCP server; only series that carry the label */
    tokensByMcpServer: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}) (increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.MCP_SERVER_NAME}=~".+"}[$__range])))`,

    /** Tokens by speed; absent label (normal requests) folds into the "normal" bucket */
    tokensBySpeed: `sort_desc(sum by (${LABELS.SPEED}) (label_replace(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]), "${LABELS.SPEED}", "normal", "${LABELS.SPEED}", "^$")))`,

    /** Tokens by effort; absent label (models without effort) folds into the "default" bucket */
    tokensByEffort: `sort_desc(sum by (${LABELS.EFFORT}) (label_replace(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__range]), "${LABELS.EFFORT}", "default", "${LABELS.EFFORT}", "^$")))`,

    // ==================== SESSION QUERIES ====================
    // Claude Code emits a real session.count metric carrying a start_type label
    // (fresh, resume, continue, agents_view). agents_view is the local `claude agents`
    // dashboard process, not a conversational session, so it is excluded from the
    // headline counts to avoid inflating them.
    //
    // The metric is emitted once per session (a single sample per unique session_id),
    // so increase()/rate() yield nothing - they need >=2 samples. Instead we count the
    // distinct session_id series present in the range via max_over_time.

    /** Total sessions (excludes agents_view dashboard launches) */
    totalSessions: `count(count by (${LABELS.SESSION_ID}) (max_over_time(${m.SESSION_COUNT}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.START_TYPE}!="agents_view"}[$__range])))`,

    /** Sessions by start type (fresh, resume, continue, agents_view) */
    sessionsByStartType: `sort_desc(count by (${LABELS.START_TYPE}) (count by (${LABELS.SESSION_ID}, ${LABELS.START_TYPE}) (max_over_time(${m.SESSION_COUNT}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))))`,

    /** Sessions by member (excludes agents_view dashboard launches) */
    sessionsByMember: `count by (${LABELS.USER_EMAIL}) (count by (${LABELS.SESSION_ID}, ${LABELS.USER_EMAIL}) (max_over_time(${m.SESSION_COUNT}{${LABELS.START_TYPE}!="agents_view"}[$__range])))`,

    /** Active users - count unique user_email labels */
    activeUsers: `count(count by (${LABELS.USER_EMAIL}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range])))`,

    // ==================== PRODUCTIVITY QUERIES ====================

    /** Total lines of code (added + removed) */
    totalLinesOfCode: `sum(increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Lines of code by type (added, removed) */
    linesOfCodeByType: `sum by (${LABELS.LOC_TYPE}) (increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /**
     * Lines of code by model. The `model` label only exists from Claude Code v2.1.172;
     * series from older clients fold into an "unknown" bucket so the split still adds up to the total.
     */
    linesOfCodeByModel: `sort_desc(sum by (${LABELS.MODEL}) (label_replace(increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]), "${LABELS.MODEL}", "unknown", "${LABELS.MODEL}", "^$")))`,

    /** Lines of code by member */
    linesOfCodeByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.LINES_OF_CODE}[$__range]))`,

    /** Lines of code over time */
    linesOfCodeOverTime: `sum(increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.LOC_TYPE})`,

    /** Total commits */
    totalCommits: `sum(increase(${m.COMMITS}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Commits by member */
    commitsByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.COMMITS}[$__range]))`,

    /** Commits over time */
    commitsOverTime: `sum(increase(${m.COMMITS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    /** Total pull requests */
    totalPullRequests: `sum(increase(${m.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Pull requests by member */
    pullRequestsByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.PULL_REQUESTS}[$__range]))`,

    /** Pull requests over time */
    pullRequestsOverTime: `sum(increase(${m.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    // ==================== ACTIVITY QUERIES ====================

    /** Total active time in seconds */
    totalActiveTime: `sum(increase(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Active time by member */
    activeTimeByMember: `sum by (${LABELS.USER_EMAIL}) (increase(${m.ACTIVE_TIME}[$__range]))`,

    /** Active time split by type: user (interaction) vs cli (processing) */
    activeTimeByType: `sum by (${LABELS.ACTIVE_TIME_TYPE}) (increase(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Active time over time, split by type: user (interaction) vs cli (processing) */
    activeTimeOverTime: `sum(increase(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.ACTIVE_TIME_TYPE})`,

    // ==================== TOOL QUERIES ====================

    /** Tool decisions (accepted, rejected) */
    toolDecisions: `sum by (${LABELS.DECISION}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Tool decisions by tool */
    toolDecisionsByTool: `sum by (${LABELS.TOOL}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Tool acceptance rate */
    toolAcceptanceRate: `sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.DECISION}="accept"}[$__range])) / clamp_min(sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range])), 1) * 100`,

    /**
     * Acceptance rate per file language, highest first. Languages with no
     * accepts are kept at 0% via the `or ... * 0` fallback (otherwise the
     * numerator has no series for them and they'd drop out).
     */
    toolAcceptanceRateByLanguage: `sort_desc((sum by (${LABELS.LANGUAGE}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.DECISION}="accept"}[$__range])) or sum by (${LABELS.LANGUAGE}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range])) * 0) / clamp_min(sum by (${LABELS.LANGUAGE}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range])), 1) * 100)`,

    /** Tool decisions by who made them: config rule, hook, or the user (allow once/always, reject, abort) */
    toolDecisionsBySource: `sort_desc(sum by (${LABELS.DECISION_SOURCE}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range])))`,

    /** Tool decisions over time */
    toolDecisionsOverTime: `sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.DECISION})`,

    // ==================== ENVIRONMENT QUERIES ====================

    /** Usage by OS type (darwin, linux, windows) */
    usageByOsType: `sum by (${LABELS.OS_TYPE}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Usage by host architecture (arm64, x64) */
    usageByHostArch: `sum by (${LABELS.HOST_ARCH}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Usage by terminal type */
    usageByTerminalType: `sum by (${LABELS.TERMINAL_TYPE}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Usage by service version */
    usageByServiceVersion: `sum by (${LABELS.SERVICE_VERSION}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,
  };
}

export type Queries = ReturnType<typeof buildQueries>;

/**
 * Display names for the `type` label values of the active-time metric.
 * `user` is keyboard interaction, `cli` is tool execution and response generation.
 */
export const ACTIVE_TIME_TYPE_NAMES = {
  user: 'User (interaction)',
  cli: 'CLI (processing)',
} as const;

/**
 * Display names for the `source` label values of the code-edit decision metric.
 * `config` and `hook` are automatic; the `user_*` values are explicit choices.
 */
export const DECISION_SOURCE_NAMES = {
  config: 'Config rule (auto)',
  hook: 'Hook (auto)',
  user_permanent: 'User: always allow',
  user_temporary: 'User: allow once',
  user_reject: 'User: reject',
  user_abort: 'User: cancel',
} as const;

/**
 * Fixed colors for the decision sources: greens for automatic, blues for user
 * allows, red/orange for user rejections, so the pie reads at a glance.
 */
export const DECISION_SOURCE_COLORS: Record<keyof typeof DECISION_SOURCE_NAMES, string> = {
  config: 'green',
  hook: 'super-light-green',
  user_permanent: 'blue',
  user_temporary: 'super-light-blue',
  user_reject: 'red',
  user_abort: 'orange',
};

/** Build queries for a specific metric format */
export { buildQueries };

/** Default queries using Prometheus metric names (backward compatible) */
export const QUERIES = buildQueries(METRICS);
