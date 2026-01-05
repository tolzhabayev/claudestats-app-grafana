import { METRICS, LABELS } from '../constants';

/**
 * PromQL query builders for Claude Code metrics
 * All queries support filtering by team member ($member) and model ($model)
 */
export const QUERIES = {
  // ==================== COST QUERIES ====================

  /** Total cost across all users/models (instant) */
  totalCost: `sum(${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

  /** Cost breakdown by model */
  costByModel: `sum by (${LABELS.MODEL}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Cost breakdown by team member */
  costByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.COST_USAGE}{${LABELS.MODEL}=~"$model"})`,

  /** Cost over time (rate) */
  costOverTime: `sum(increase(${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.MODEL})`,

  /** Cost over time by member */
  costOverTimeByMember: `sum(increase(${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.USER_EMAIL})`,

  // ==================== TOKEN QUERIES ====================

  /** Total tokens (all types) */
  totalTokens: `sum(${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

  /** Tokens by type (input, output, cache_read, cache_creation) */
  tokensByType: `sum by (${LABELS.TOKEN_TYPE}) (${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"})`,

  /** Tokens by model */
  tokensByModel: `sum by (${LABELS.MODEL}) (${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Tokens over time */
  tokensOverTime: `sum(rate(${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model"}[$__rate_interval])) by (${LABELS.TOKEN_TYPE})`,

  /** Tokens by member */
  tokensByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.TOKEN_USAGE}{${LABELS.MODEL}=~"$model"})`,

  // ==================== SESSION QUERIES ====================

  /** Total sessions - count unique session_id labels */
  totalSessions: `count(count by (${LABELS.SESSION_ID}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}))`,

  /** Sessions by member */
  sessionsByMember: `count by (${LABELS.USER_EMAIL}) (count by (${LABELS.SESSION_ID}, ${LABELS.USER_EMAIL}) (${METRICS.COST_USAGE}))`,

  /** Active users - count unique user_email labels */
  activeUsers: `count(count by (${LABELS.USER_EMAIL}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"}))`,

  // ==================== PRODUCTIVITY QUERIES ====================

  /** Total lines of code (added + removed) */
  totalLinesOfCode: `sum(${METRICS.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Lines of code by type (added, removed) */
  linesOfCodeByType: `sum by (${LABELS.LOC_TYPE}) (${METRICS.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Lines of code by member */
  linesOfCodeByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.LINES_OF_CODE})`,

  /** Lines of code over time */
  linesOfCodeOverTime: `sum(increase(${METRICS.LINES_OF_CODE}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.LOC_TYPE})`,

  /** Total commits */
  totalCommits: `sum(${METRICS.COMMITS}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Commits by member */
  commitsByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.COMMITS})`,

  /** Commits over time */
  commitsOverTime: `sum(increase(${METRICS.COMMITS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

  /** Total pull requests */
  totalPullRequests: `sum(${METRICS.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Pull requests by member */
  pullRequestsByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.PULL_REQUESTS})`,

  /** Pull requests over time */
  pullRequestsOverTime: `sum(increase(${METRICS.PULL_REQUESTS}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

  // ==================== ACTIVITY QUERIES ====================

  /** Total active time in seconds */
  totalActiveTime: `sum(${METRICS.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Active time by member */
  activeTimeByMember: `sum by (${LABELS.USER_EMAIL}) (${METRICS.ACTIVE_TIME})`,

  /** Active time over time */
  activeTimeOverTime: `sum(increase(${METRICS.ACTIVE_TIME}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval]))`,

  // ==================== TOOL QUERIES ====================

  /** Tool decisions (accepted, rejected) */
  toolDecisions: `sum by (${LABELS.DECISION}) (${METRICS.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Tool decisions by tool */
  toolDecisionsByTool: `sum by (${LABELS.TOOL}) (${METRICS.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Tool acceptance rate */
  toolAcceptanceRate: `sum(${METRICS.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.DECISION}="accept"}) / sum(${METRICS.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}) * 100`,

  // ==================== ENVIRONMENT QUERIES ====================

  /** Usage by OS type (darwin, linux, windows) */
  usageByOsType: `sum by (${LABELS.OS_TYPE}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Usage by host architecture (arm64, x64) */
  usageByHostArch: `sum by (${LABELS.HOST_ARCH}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Usage by terminal type */
  usageByTerminalType: `sum by (${LABELS.TERMINAL_TYPE}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

  /** Usage by service version */
  usageByServiceVersion: `sum by (${LABELS.SERVICE_VERSION}) (${METRICS.COST_USAGE}{${LABELS.USER_EMAIL}=~"$member"})`,

} as const;
