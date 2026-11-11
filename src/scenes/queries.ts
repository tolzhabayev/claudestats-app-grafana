import { getMetrics, LABELS, MetricNames } from '../constants';
import { FilterDimension, getFilterDimensions } from './dimensions';

/** Member value for usage that carries none of the identity labels. */
export const UNATTRIBUTED = 'Unattributed';

// Identity labels in order of preference: the first non-empty one names the member.
const MEMBER_LABELS = [LABELS.USER_EMAIL, LABELS.ENDUSER_ID, LABELS.USER_ID] as const;

/**
 * `fn(metric{matchers}[range])`, limited to the members picked in `$member`.
 *
 * A member is identified by `user_email`, else `enduser_id`, else `user_id`, so a
 * series is matched on the first of those it actually carries. A series with an
 * email is never matched on its `user_id`, and the branches are disjoint, so `or`
 * just unions them. With "All" (`.*`) the first branch alone matches everything.
 */
function scopedToMembers(fn: string, metric: string, range: string, matchers = ''): string {
  const extra = matchers ? `, ${matchers}` : '';
  const branches = MEMBER_LABELS.map((label, i) => {
    const higher = MEMBER_LABELS.slice(0, i).map((l) => `${l}=""`);
    const selector = [...higher, `${label}=~"$member"`].join(', ');
    return `${fn}(${metric}{${selector}${extra}}[${range}])`;
  });
  return `(${branches.join(' or ')})`;
}

/**
 * Adds a `member` label to every series of `expr`: the first non-empty of
 * `user_email`, `enduser_id`, `user_id`, or "Unattributed" when none is set.
 * Used by every "by member" breakdown so API-key and cloud-provider users show
 * up under their own name instead of an empty one.
 */
function withMember(expr: string): string {
  return `label_replace(${resolveMember(expr)}, "${LABELS.MEMBER}", "${UNATTRIBUTED}", "${LABELS.MEMBER}", "^$")`;
}

/** The `member` label without the Unattributed fallback (left unset when no identity label exists). */
function resolveMember(expr: string): string {
  return [...MEMBER_LABELS]
    .reverse()
    .reduce((e, label) => `label_replace(${e}, "${LABELS.MEMBER}", "$1", "${label}", "(.+)")`, expr);
}

/**
 * Query for the Team Member variable: every identifiable member with spend in
 * the range. The variable extracts the `member` label from the result, so usage
 * with no identity (nothing to filter on) is not offered as an option.
 */
export function memberValuesQuery(m: MetricNames): string {
  return `query_result(count by (${LABELS.MEMBER}) (${resolveMember(`max_over_time(${m.COST_USAGE}[$__range])`)}))`;
}

/**
 * PromQL query builders for Claude Code metrics.
 *
 * Every query is filtered by the filter dimensions (Repository and any labels
 * configured on the configuration page), and all but the "by member"
 * comparisons by team member ($member). Cost and token queries also filter by
 * model ($model).
 */
function buildQueries(m: MetricNames, dimensions: FilterDimension[] = getFilterDimensions()) {
  // `vcs_repository_name=~"$repository", project=~"$label_project", ...`
  const dims = dimensions.map((d) => `${d.label}=~"$${d.variable}"`).join(', ');
  const join = (...matchers: string[]) => matchers.filter(Boolean).join(', ');
  /** `fn(metric{matchers}[range])` for the selected members and filter dimensions */
  const scoped = (fn: string, metric: string, range: string, matchers = '') =>
    scopedToMembers(fn, metric, range, join(matchers, dims));
  /** Selector for the "by member" comparisons, which skip the member filter but keep the dimensions */
  const sel = (metric: string, matchers = '') => `${metric}{${join(matchers, dims)}}`;

  return {
    // ==================== COST QUERIES ====================

    /** Total cost across all users/models (instant) */
    totalCost: `sum(${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)})`,

    /** Cost breakdown by model */
    costByModel: `sum by (${LABELS.MODEL}) (${scoped('increase', m.COST_USAGE, '$__range')})`,

    /** Cost breakdown by team member */
    costByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.COST_USAGE, `${LABELS.MODEL}=~"$model"`)}[$__range])`)})`,

    /** Cost over time (rate) */
    costOverTime: `sum(${scoped('increase', m.COST_USAGE, '$__rate_interval', `${LABELS.MODEL}=~"$model"`)}) by (${LABELS.MODEL})`,

    /** Cost over time by member */
    costOverTimeByMember: `sum by (${LABELS.MEMBER}) (${withMember(scoped('increase', m.COST_USAGE, '$__rate_interval', `${LABELS.MODEL}=~"$model"`))})`,

    /** Cost table breakdown by member and model */
    costTable: `sum by (${LABELS.MEMBER}, ${LABELS.MODEL}) (${withMember(scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`))})`,

    // ---- Cost attribution (what is driving spend) ----
    // sort_desc so the bar gauges render biggest spender first.

    /** Cost by query source (main, subagent, auxiliary) */
    costByQuerySource: `sort_desc(sum by (${LABELS.QUERY_SOURCE}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}))`,

    /** Cost by subagent (agent_name); only series that carry the label */
    costByAgent: `sort_desc(sum by (${LABELS.AGENT_NAME}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.AGENT_NAME}=~".+"`)}))`,

    /** Cost by skill; only series that carry the label */
    costBySkill: `sort_desc(sum by (${LABELS.SKILL_NAME}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.SKILL_NAME}=~".+"`)}))`,

    /** Cost by MCP server; only series that carry the label */
    costByMcpServer: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.MCP_SERVER_NAME}=~".+"`)}))`,

    /** Cost by repository (needs OTEL_METRICS_INCLUDE_REPOSITORY=true) */
    costByRepository: `sort_desc(sum by (${LABELS.REPOSITORY}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.REPOSITORY}=~".+"`)}))`,

    /** Cost by MCP tool, per server (only requests that consumed an MCP tool result) */
    costByMcpTool: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}, ${LABELS.MCP_TOOL_NAME}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.MCP_TOOL_NAME}=~".+"`)}))`,

    /** Cost by plugin that owns the active skill or subagent (third-party plugins collapse to "third-party") */
    costByPlugin: `sort_desc(sum by (${LABELS.PLUGIN_NAME}) (${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.PLUGIN_NAME}=~".+"`)}))`,

    /** Cost by speed; absent label (normal requests) folds into the "normal" bucket */
    costBySpeed: `sort_desc(sum by (${LABELS.SPEED}) (label_replace(${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}, "${LABELS.SPEED}", "normal", "${LABELS.SPEED}", "^$")))`,

    /** Cost by effort; absent label (models without effort) folds into the "default" bucket */
    costByEffort: `sort_desc(sum by (${LABELS.EFFORT}) (label_replace(${scoped('increase', m.COST_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}, "${LABELS.EFFORT}", "default", "${LABELS.EFFORT}", "^$")))`,

    // ==================== TOKEN QUERIES ====================

    /** Total tokens (all types) */
    totalTokens: `sum(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)})`,

    /** Input tokens */
    inputTokens: `sum(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="input"`)})`,

    /** Output tokens */
    outputTokens: `sum(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="output"`)})`,

    /** Cache read tokens */
    cacheReadTokens: `sum(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="cacheRead"`)})`,

    /** Tokens by type (input, output, cacheRead, cacheCreation) */
    tokensByType: `sum by (${LABELS.TOKEN_TYPE}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)})`,

    /** Tokens by model */
    tokensByModel: `sum by (${LABELS.MODEL}) (${scoped('increase', m.TOKEN_USAGE, '$__range')})`,

    /** Tokens over time */
    tokensOverTime: `sum(${scoped('rate', m.TOKEN_USAGE, '$__rate_interval', `${LABELS.MODEL}=~"$model"`)}) by (${LABELS.TOKEN_TYPE})`,

    /** Tokens by member */
    tokensByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.TOKEN_USAGE, `${LABELS.MODEL}=~"$model"`)}[$__range])`)})`,

    // ---- Token attribution (what is driving usage) ----
    // sort_desc so the bar gauges render biggest consumer first.

    /** Tokens by query source (main, subagent, auxiliary) */
    tokensByQuerySource: `sort_desc(sum by (${LABELS.QUERY_SOURCE}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}))`,

    /** Tokens by subagent (agent_name); only series that carry the label */
    tokensByAgent: `sort_desc(sum by (${LABELS.AGENT_NAME}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.AGENT_NAME}=~".+"`)}))`,

    /** Tokens by skill; only series that carry the label */
    tokensBySkill: `sort_desc(sum by (${LABELS.SKILL_NAME}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.SKILL_NAME}=~".+"`)}))`,

    /** Tokens by MCP server; only series that carry the label */
    tokensByMcpServer: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.MCP_SERVER_NAME}=~".+"`)}))`,

    /** Tokens by repository (needs OTEL_METRICS_INCLUDE_REPOSITORY=true) */
    tokensByRepository: `sort_desc(sum by (${LABELS.REPOSITORY}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.REPOSITORY}=~".+"`)}))`,

    /** Tokens by MCP tool, per server (only requests that consumed an MCP tool result) */
    tokensByMcpTool: `sort_desc(sum by (${LABELS.MCP_SERVER_NAME}, ${LABELS.MCP_TOOL_NAME}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.MCP_TOOL_NAME}=~".+"`)}))`,

    /** Tokens by plugin that owns the active skill or subagent (third-party plugins collapse to "third-party") */
    tokensByPlugin: `sort_desc(sum by (${LABELS.PLUGIN_NAME}) (${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model", ${LABELS.PLUGIN_NAME}=~".+"`)}))`,

    /** Tokens by speed; absent label (normal requests) folds into the "normal" bucket */
    tokensBySpeed: `sort_desc(sum by (${LABELS.SPEED}) (label_replace(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}, "${LABELS.SPEED}", "normal", "${LABELS.SPEED}", "^$")))`,

    /** Tokens by effort; absent label (models without effort) folds into the "default" bucket */
    tokensByEffort: `sort_desc(sum by (${LABELS.EFFORT}) (label_replace(${scoped('increase', m.TOKEN_USAGE, '$__range', `${LABELS.MODEL}=~"$model"`)}, "${LABELS.EFFORT}", "default", "${LABELS.EFFORT}", "^$")))`,

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
    totalSessions: `count(count by (${LABELS.SESSION_ID}) (${scoped('max_over_time', m.SESSION_COUNT, '$__range', `${LABELS.START_TYPE}!="agents_view"`)}))`,

    /** Sessions by start type (fresh, resume, continue, agents_view) */
    sessionsByStartType: `sort_desc(count by (${LABELS.START_TYPE}) (count by (${LABELS.SESSION_ID}, ${LABELS.START_TYPE}) (${scoped('max_over_time', m.SESSION_COUNT, '$__range')})))`,

    /** Sessions by member (excludes agents_view dashboard launches) */
    sessionsByMember: `count by (${LABELS.MEMBER}) (count by (${LABELS.SESSION_ID}, ${LABELS.MEMBER}) (${withMember(`max_over_time(${sel(m.SESSION_COUNT, `${LABELS.START_TYPE}!="agents_view"`)}[$__range])`)}))`,

    /**
     * Active users: distinct members (email, else enduser.id, else user.id) with spend in the range.
     * Usage with no identity at all is not a person, so it is left out: it has no `member`
     * label, which `unless on (member) vector(1)` drops (vector(1) has an empty `member` too).
     * Checking presence, not the "Unattributed" display name, keeps a real member of that name.
     */
    activeUsers: `count(count by (${LABELS.MEMBER}) (${resolveMember(scoped('increase', m.COST_USAGE, '$__range'))}) unless on (${LABELS.MEMBER}) vector(1))`,

    // ==================== PRODUCTIVITY QUERIES ====================

    /** Total lines of code (added + removed) */
    totalLinesOfCode: `sum(${scoped('increase', m.LINES_OF_CODE, '$__range')})`,

    /** Lines of code by type (added, removed) */
    linesOfCodeByType: `sum by (${LABELS.LOC_TYPE}) (${scoped('increase', m.LINES_OF_CODE, '$__range')})`,

    /**
     * Lines of code by model. The `model` label only exists from Claude Code v2.1.172;
     * series from older clients fold into an "unknown" bucket so the split still adds up to the total.
     */
    linesOfCodeByModel: `sort_desc(sum by (${LABELS.MODEL}) (label_replace(${scoped('increase', m.LINES_OF_CODE, '$__range')}, "${LABELS.MODEL}", "unknown", "${LABELS.MODEL}", "^$")))`,

    /** Lines of code by member */
    linesOfCodeByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.LINES_OF_CODE)}[$__range])`)})`,

    /** Lines of code over time */
    linesOfCodeOverTime: `sum(${scoped('increase', m.LINES_OF_CODE, '$__rate_interval')}) by (${LABELS.LOC_TYPE})`,

    /** Total commits */
    totalCommits: `sum(${scoped('increase', m.COMMITS, '$__range')})`,

    /** Commits by member */
    commitsByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.COMMITS)}[$__range])`)})`,

    /** Commits over time */
    commitsOverTime: `sum(${scoped('increase', m.COMMITS, '$__rate_interval')})`,

    /** Total pull requests */
    totalPullRequests: `sum(${scoped('increase', m.PULL_REQUESTS, '$__range')})`,

    /** Pull requests by member */
    pullRequestsByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.PULL_REQUESTS)}[$__range])`)})`,

    /** Pull requests over time */
    pullRequestsOverTime: `sum(${scoped('increase', m.PULL_REQUESTS, '$__rate_interval')})`,

    // ==================== ACTIVITY QUERIES ====================

    /** Total active time in seconds */
    totalActiveTime: `sum(${scoped('increase', m.ACTIVE_TIME, '$__range')})`,

    /** Active time by member */
    activeTimeByMember: `sum by (${LABELS.MEMBER}) (${withMember(`increase(${sel(m.ACTIVE_TIME)}[$__range])`)})`,

    /** Active time split by type: user (interaction) vs cli (processing) */
    activeTimeByType: `sum by (${LABELS.ACTIVE_TIME_TYPE}) (${scoped('increase', m.ACTIVE_TIME, '$__range')})`,

    /** Active time over time, split by type: user (interaction) vs cli (processing) */
    activeTimeOverTime: `sum(${scoped('increase', m.ACTIVE_TIME, '$__rate_interval')}) by (${LABELS.ACTIVE_TIME_TYPE})`,

    // ==================== TOOL QUERIES ====================

    /** Tool decisions (accepted, rejected) */
    toolDecisions: `sum by (${LABELS.DECISION}) (${scoped('increase', m.TOOL_DECISION, '$__range')})`,

    /** Tool decisions by tool */
    toolDecisionsByTool: `sum by (${LABELS.TOOL}) (${scoped('increase', m.TOOL_DECISION, '$__range')})`,

    /** Tool acceptance rate */
    toolAcceptanceRate: `sum(${scoped('increase', m.TOOL_DECISION, '$__range', `${LABELS.DECISION}="accept"`)}) / clamp_min(sum(${scoped('increase', m.TOOL_DECISION, '$__range')}), 1) * 100`,

    /**
     * Acceptance rate per file language, highest first. Languages with no
     * accepts are kept at 0% via the `or ... * 0` fallback (otherwise the
     * numerator has no series for them and they'd drop out).
     */
    toolAcceptanceRateByLanguage: `sort_desc((sum by (${LABELS.LANGUAGE}) (${scoped('increase', m.TOOL_DECISION, '$__range', `${LABELS.DECISION}="accept"`)}) or sum by (${LABELS.LANGUAGE}) (${scoped('increase', m.TOOL_DECISION, '$__range')}) * 0) / clamp_min(sum by (${LABELS.LANGUAGE}) (${scoped('increase', m.TOOL_DECISION, '$__range')}), 1) * 100)`,

    /** Tool decisions by who made them: config rule, hook, or the user (allow once/always, reject, abort) */
    toolDecisionsBySource: `sort_desc(sum by (${LABELS.DECISION_SOURCE}) (${scoped('increase', m.TOOL_DECISION, '$__range')}))`,

    /** Tool decisions over time */
    toolDecisionsOverTime: `sum(${scoped('increase', m.TOOL_DECISION, '$__rate_interval')}) by (${LABELS.DECISION})`,

    // ==================== ENVIRONMENT QUERIES ====================

    /** Usage by OS type (darwin, linux, windows) */
    usageByOsType: `sum by (${LABELS.OS_TYPE}) (${scoped('increase', m.COST_USAGE, '$__range')})`,

    /** Usage by host architecture (arm64, x64) */
    usageByHostArch: `sum by (${LABELS.HOST_ARCH}) (${scoped('increase', m.COST_USAGE, '$__range')})`,

    /** Usage by terminal type */
    usageByTerminalType: `sum by (${LABELS.TERMINAL_TYPE}) (${scoped('increase', m.COST_USAGE, '$__range')})`,

    /** Usage by service version */
    usageByServiceVersion: `sum by (${LABELS.SERVICE_VERSION}) (${scoped('increase', m.COST_USAGE, '$__range')})`,
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
export const QUERIES = buildQueries(getMetrics());
