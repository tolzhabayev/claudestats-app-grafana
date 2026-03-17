import { METRICS, LABELS, MetricNames } from '../constants';

/**
 * PromQL query builders for Claude Code metrics
 * All queries support filtering by team member ($member) and model ($model)
 */

function buildQueries(m: MetricNames) {
  return {
    // ==================== COST QUERIES ====================

    /** Total cost across all users/models (instant) */
    totalCost: `sum(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

    /** Cost breakdown by model */
    costByModel: `sum by (${LABELS.MODEL}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Cost breakdown by team member */
    costByMember: `sum by (${LABELS.USER_EMAIL}) (${m.COST_USAGE}{${LABELS.MODEL}=~"$model"})`,

    /** Cost over time (rate) */
    costOverTime: `sum(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.MODEL})`,

    /** Cost over time by member */
    costOverTimeByMember: `sum(increase(${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.USER_EMAIL})`,

    /** Cost table breakdown by member and model */
    costTable: `sum by (${LABELS.USER_EMAIL}, ${LABELS.MODEL}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

    // ==================== TOKEN QUERIES ====================

    /** Total tokens (all types) */
    totalTokens: `sum(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

    /** Input tokens */
    inputTokens: `sum(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="input"})`,

    /** Output tokens */
    outputTokens: `sum(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="output"})`,

    /** Cache read tokens */
    cacheReadTokens: `sum(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="cache_read"})`,

    /** Tokens by type (input, output, cache_read, cache_creation) */
    tokensByType: `sum by (${LABELS.TOKEN_TYPE}) (${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

    /** Tokens by model */
    tokensByModel: `sum by (${LABELS.MODEL}) (${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Tokens over time */
    tokensOverTime: `sum(rate(${m.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.TOKEN_TYPE})`,

    /** Tokens by member */
    tokensByMember: `sum by (${LABELS.USER_EMAIL}) (${m.TOKEN_USAGE}{${LABELS.MODEL}=~"$model"})`,

    // ==================== SESSION QUERIES ====================

    /** Total sessions - count unique session_id labels */
    totalSessions: `count(count by (${LABELS.SESSION_ID}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}))`,

    /** Sessions by member */
    sessionsByMember: `count by (${LABELS.USER_EMAIL}) (count by (${LABELS.SESSION_ID}, ${LABELS.USER_EMAIL}) (${m.COST_USAGE}))`,

    /** Active users - count unique user_email labels */
    activeUsers: `count(count by (${LABELS.USER_EMAIL}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}))`,

    // ==================== PRODUCTIVITY QUERIES ====================

    /** Total lines of code (added + removed) */
    totalLinesOfCode: `sum(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Lines of code by type (added, removed) */
    linesOfCodeByType: `sum by (${LABELS.LOC_TYPE}) (${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Lines of code by member */
    linesOfCodeByMember: `sum by (${LABELS.USER_EMAIL}) (${m.LINES_OF_CODE})`,

    /** Lines of code over time */
    linesOfCodeOverTime: `sum(increase(${m.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.LOC_TYPE})`,

    /** Total commits */
    totalCommits: `sum(${m.COMMITS}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Commits by member */
    commitsByMember: `sum by (${LABELS.USER_EMAIL}) (${m.COMMITS})`,

    /** Commits over time */
    commitsOverTime: `sum(increase(${m.COMMITS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    /** Total pull requests */
    totalPullRequests: `sum(${m.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Pull requests by member */
    pullRequestsByMember: `sum by (${LABELS.USER_EMAIL}) (${m.PULL_REQUESTS})`,

    /** Pull requests over time */
    pullRequestsOverTime: `sum(increase(${m.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    // ==================== ACTIVITY QUERIES ====================

    /** Total active time in seconds */
    totalActiveTime: `sum(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Active time by member */
    activeTimeByMember: `sum by (${LABELS.USER_EMAIL}) (${m.ACTIVE_TIME})`,

    /** Active time over time */
    activeTimeOverTime: `sum(increase(${m.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

    // ==================== TOOL QUERIES ====================

    /** Tool decisions (accepted, rejected) */
    toolDecisions: `sum by (${LABELS.DECISION}) (${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Tool decisions by tool */
    toolDecisionsByTool: `sum by (${LABELS.TOOL}) (${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Tool acceptance rate */
    toolAcceptanceRate: `sum(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.DECISION}="accept"}) / sum(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}) * 100`,

    /** Tool decisions over time */
    toolDecisionsOverTime: `sum(increase(${m.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.DECISION})`,

    // ==================== ENVIRONMENT QUERIES ====================

    /** Usage by OS type (darwin, linux, windows) */
    usageByOsType: `sum by (${LABELS.OS_TYPE}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Usage by host architecture (arm64, x64) */
    usageByHostArch: `sum by (${LABELS.HOST_ARCH}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Usage by terminal type */
    usageByTerminalType: `sum by (${LABELS.TERMINAL_TYPE}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

    /** Usage by service version */
    usageByServiceVersion: `sum by (${LABELS.SERVICE_VERSION}) (${m.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,
  };
}

export type Queries = ReturnType<typeof buildQueries>;

/** Build queries for a specific metric format */
export { buildQueries };

/** Default queries using Prometheus metric names (backward compatible) */
export const QUERIES = buildQueries(METRICS);
