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
    cacheReadTokens: `sum(increase(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="cache_read"}[$__range]))`,

    /** Tokens by type (input, output, cache_read, cache_creation) */
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

    /** Total sessions - count unique session_id labels */
    totalSessions: `count(count by (${LABELS.SESSION_ID}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range])))`,

    /** Sessions by member */
    sessionsByMember: `count by (${LABELS.USER_EMAIL}) (count by (${LABELS.SESSION_ID}, ${LABELS.USER_EMAIL}) (increase(${m.COST_USAGE}[$__range])))`,

    /** Active users - count unique user_email labels */
    activeUsers: `count(count by (${LABELS.USER_EMAIL}) (increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}[$__range])))`,

    // ==================== PRODUCTIVITY QUERIES ====================

    /** Total lines of code (added + removed) */
    totalLinesOfCode: `sum(increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Lines of code by type (added, removed) */
    linesOfCodeByType: `sum by (${LABELS.LOC_TYPE}) (increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

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

    /** Active time over time */
    activeTimeOverTime: `sum(increase(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    // ==================== TOOL QUERIES ====================

    /** Tool decisions (accepted, rejected) */
    toolDecisions: `sum by (${LABELS.DECISION}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Tool decisions by tool */
    toolDecisionsByTool: `sum by (${LABELS.TOOL}) (increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range]))`,

    /** Tool acceptance rate */
    toolAcceptanceRate: `sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.DECISION}="accept"}[$__range])) / clamp_min(sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__range])), 1) * 100`,

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

/** Build queries for a specific metric format */
export { buildQueries };

/** Default queries using Prometheus metric names (backward compatible) */
export const QUERIES = buildQueries(METRICS);
