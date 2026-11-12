import { LABELS } from '../constants';
import { FilterDimension, getFilterDimensions } from './dimensions';
import { DECISION_SOURCE_NAMES } from './queries';

/**
 * LogQL queries for Claude Code events (OTel logs) in Loki.
 *
 * Loki's native OTLP ingestion keeps `service.name` as an index label and the
 * event attributes as structured metadata, with dots turned into underscores
 * (`event.name` -> `event_name`, `status_code`, `attempt`, `user_email`, ...).
 * Structured metadata can be filtered on like labels after the stream selector.
 */

/** Stream of every Claude Code event. */
const STREAM = '{service_name="claude-code"}';

/** Events whose `event.name` matches the given (regex) name. */
function events(name: string, filters: string): string {
  return `${STREAM} | event_name=~"${name}" | ${filters}`;
}

/**
 * Member filter with the same identity fallback as the metrics queries:
 * a member is user_email, else enduser_id, else user_id. An absent attribute
 * reads as an empty string.
 */
const MEMBER_FILTER =
  `(${LABELS.USER_EMAIL}=~"$member"` +
  ` or (${LABELS.USER_EMAIL}="" and ${LABELS.ENDUSER_ID}=~"$member")` +
  ` or (${LABELS.USER_EMAIL}="" and ${LABELS.ENDUSER_ID}="" and ${LABELS.USER_ID}=~"$member"))`;

/** Bucket for errors without an HTTP status (timeouts, connection failures). */
export const NO_STATUS = 'No status';

/** Refusal category label when the category is sent only with OTEL_LOG_TOOL_DETAILS=1. */
export const CATEGORY_HIDDEN = 'Categorized (needs OTEL_LOG_TOOL_DETAILS=1)';
export const NO_CATEGORY = 'No category';

/** Permission modes that loosen the checks: everything is allowed, or the classifier decides. */
export const ESCALATED_MODES = ['bypassPermissions', 'auto'] as const;

/** Member name with the same identity fallback as the metrics, for grouping events by person. */
const MEMBER_TEMPLATE =
  '{{ if .user_email }}{{ .user_email }}{{ else if .enduser_id }}{{ .enduser_id }}{{ else if .user_id }}{{ .user_id }}{{ else }}Unattributed{{ end }}';

/**
 * Prompt length buckets (characters) for the Prompt Length panel, in display
 * order. Each is its own query, so the panel keeps this order.
 */
export const PROMPT_LENGTH_BUCKETS = [
  { name: 'Under 100', filter: '| prompt_length < 100' },
  { name: '100 to 499', filter: '| prompt_length >= 100 | prompt_length < 500' },
  { name: '500 to 1,999', filter: '| prompt_length >= 500 | prompt_length < 2000' },
  { name: '2,000 or more', filter: '| prompt_length >= 2000' },
] as const;

// Counts fall back to 0 only when there are API request events in the period: with
// none at all (events not exported) they stay empty, so the panels can say so.
export function buildLogQueries(dimensions: FilterDimension[] = getFilterDimensions()) {
  const dims = dimensions.map((d) => `${d.label}=~"$${d.variable}"`);
  const filters = [MEMBER_FILTER, `${LABELS.MODEL}=~"$model"`, ...dims].join(' | ');
  // tool_result events carry no model, so the tool queries skip the Model filter.
  const toolFilters = [MEMBER_FILTER, ...dims].join(' | ');
  const tools = events('tool_result', toolFilters);
  // Workflow events. Only api_request and subagent_completed carry a model, so
  // the Workflow tab skips the Model filter throughout.
  const requestsAll = events('api_request', toolFilters);
  const subagents = events('subagent_completed', toolFilters);
  const compactions = events('compaction', toolFilters);
  const skills = events('skill_activated', toolFilters);
  const mcp = events('mcp_server_connection', toolFilters);
  const hooks = events('hook_execution_complete', toolFilters);
  /** `numerator` as a share of `all`, by `by`; 0% where `all` has events but `numerator` none. */
  const share = (numerator: string, all: string, by = '') => {
    const g = by ? ` by (${by})` : '';
    return `(sum${g} (count_over_time(${numerator} [$__range])) or sum${g} (count_over_time(${all} [$__range])) * 0) / sum${g} (count_over_time(${all} [$__range])) * 100`;
  };

  // Security events (none carry a model).
  const modeChanges = events('permission_mode_changed', toolFilters);
  const escalations = `${modeChanges} | to_mode=~"${ESCALATED_MODES.join('|')}"`;
  const decisions = events('tool_decision', toolFilters);
  const auth = events('auth', toolFilters);
  const pluginInstalls = events('plugin_installed', toolFilters);
  const managedSettings = events('managed_settings_resolved', toolFilters);

  // user_prompt events carry no model either.
  const prompts = events('user_prompt', toolFilters);
  // A prompt that invokes a slash command has command_name; a typed prompt has none.
  const typed = `${prompts} | command_name=""`;
  const commands = `${prompts} | command_name!=""`;
  /** Template mapping a decision source field to the names the Tools tab uses. */
  const sourceNameOf = (field: string) =>
    Object.entries(DECISION_SOURCE_NAMES).reduceRight(
      (rest, [value, name]) => `{{ if eq .${field} "${value}" }}${name}{{ else }}${rest}{{ end }}`,
      `{{ .${field} }}`
    );

  const errors = events('api_error', filters);
  const requests = events('api_error|api_request', filters);
  // Refusals the user saw: a refusal the API already retried on another model
  // (server_fallback_hop=true) never reached the user.
  const refusals = `${events('api_refusal', filters)} | server_fallback_hop!="true"`;
  const exhausted = events('api_retries_exhausted', filters);
  const zeroIfRequests = `sum(count_over_time(${requests} [$__range])) * 0`;

  return {
    /** API errors in the period. Each is the final error of a request, after Claude Code's own retries. */
    apiErrors: `sum(count_over_time(${errors} [$__range])) or ${zeroIfRequests}`,

    /** Errors as a share of API requests (errors + successful requests); 0% with requests but no errors, empty without requests. */
    errorRate: `(sum(count_over_time(${errors} [$__range])) or ${zeroIfRequests}) / sum(count_over_time(${requests} [$__range])) * 100`,

    /** Requests that failed after more than one attempt. */
    retriesExhausted: `sum(count_over_time(${exhausted} [$__range])) or ${zeroIfRequests}`,

    /** Refusals the user saw. */
    refusals: `sum(count_over_time(${refusals} [$__range])) or ${zeroIfRequests}`,

    /** Errors per interval by HTTP status; non-HTTP failures get their own bucket. */
    errorsOverTime: `sum by (status_code) (count_over_time(${errors} | label_format status_code=\`{{ if .status_code }}{{ .status_code }}{{ else }}${NO_STATUS}{{ end }}\` [$__interval]))`,

    /** Errors by model */
    errorsByModel: `sort_desc(sum by (model) (count_over_time(${errors} [$__range])))`,

    /** Errors by number of attempts made (including the first request) */
    errorsByAttempt: `sum by (attempt) (count_over_time(${errors} [$__range]))`,

    /**
     * Refusals by category. The category is only sent with OTEL_LOG_TOOL_DETAILS=1,
     * so a categorized refusal without it gets a bucket saying so.
     */
    refusalsByCategory: `sort_desc(sum by (category) (count_over_time(${refusals} | label_format category=\`{{ if .category }}{{ .category }}{{ else if eq .has_category "true" }}${CATEGORY_HIDDEN}{{ else }}${NO_CATEGORY}{{ end }}\` [$__range])))`,

    // ---------- Tool performance (tool_result events) ----------

    /** Tool calls per tool (only calls that ran: rejected calls have no result) */
    toolCalls: `sum by (tool_name) (count_over_time(${tools} [$__range]))`,

    /** Share of calls that failed, per tool; tools without failures stay at 0% */
    toolFailureRate: `(sum by (tool_name) (count_over_time(${tools} | success="false" [$__range])) or sum by (tool_name) (count_over_time(${tools} [$__range])) * 0) / sum by (tool_name) (count_over_time(${tools} [$__range])) * 100`,

    /** Median execution time per tool, in ms */
    toolLatencyP50: `quantile_over_time(0.5, ${tools} | unwrap duration_ms [$__range]) by (tool_name)`,

    /** 95th percentile execution time per tool, in ms */
    toolLatencyP95: `quantile_over_time(0.95, ${tools} | unwrap duration_ms [$__range]) by (tool_name)`,

    /** Failed calls by error category, such as Error:ENOENT or ShellError */
    toolErrorTypes: `sort_desc(sum by (error_type) (count_over_time(${tools} | success="false" | label_format error_type=\`{{ if .error_type }}{{ .error_type }}{{ else }}Unknown{{ end }}\` [$__range])))`,

    /** 95th percentile execution time by who allowed the call (config rule, hook or the user) */
    toolLatencyP95BySource: `sort_desc(quantile_over_time(0.95, ${tools} | label_format decision_source=\`${sourceNameOf('decision_source')}\` | unwrap duration_ms [$__range]) by (decision_source))`,

    // ---------- Prompts (user_prompt events) ----------

    /** Prompts in the period, typed prompts and slash commands */
    prompts: `sum(count_over_time(${prompts} [$__range]))`,

    /** Share of prompts that invoked a slash command; 0% with prompts but no commands */
    commandShare: `(sum(count_over_time(${commands} [$__range])) or sum(count_over_time(${prompts} [$__range])) * 0) / sum(count_over_time(${prompts} [$__range])) * 100`,

    /** Average number of prompts per session */
    promptsPerSession: `avg(sum by (session_id) (count_over_time(${prompts} [$__range])))`,

    /** Median length of typed prompts, in characters (slash commands left out) */
    promptLengthP50: `quantile_over_time(0.5, ${typed} | unwrap prompt_length [$__range]) by (service_name)`,

    /** Prompts per interval, split into typed prompts and slash commands */
    promptsOverTime: `sum by (kind) (count_over_time(${prompts} | label_format kind=\`{{ if .command_name }}Slash command{{ else }}Typed prompt{{ end }}\` [$__interval]))`,

    /** Most-used slash commands; custom, plugin and MCP names collapse unless OTEL_LOG_TOOL_DETAILS=1 */
    topCommands: `sort_desc(sum by (command_name) (count_over_time(${commands} [$__range])))`,

    /** Slash commands by origin: builtin, custom (including plugins) or mcp */
    commandsBySource: `sort_desc(sum by (command_source) (count_over_time(${commands} [$__range])))`,

    /**
     * Typed prompts per length bucket, in PROMPT_LENGTH_BUCKETS order. An empty
     * bucket is 0 when there are typed prompts, so all four bars stay; with no
     * typed prompts at all the panel shows its no-events hint.
     */
    promptLengthBuckets: PROMPT_LENGTH_BUCKETS.map(
      (b) => `sum(count_over_time(${typed} ${b.filter} [$__range])) or sum(count_over_time(${typed} [$__range])) * 0`
    ),

    // ---------- Workflow ----------

    /** API requests per model */
    requestsByModel: `sum by (model) (count_over_time(${requestsAll} [$__range]))`,
    /** Median API request duration per model, in ms */
    requestLatencyP50: `quantile_over_time(0.5, ${requestsAll} | unwrap duration_ms [$__range]) by (model)`,
    /** 95th percentile API request duration per model, in ms */
    requestLatencyP95: `quantile_over_time(0.95, ${requestsAll} | unwrap duration_ms [$__range]) by (model)`,
    /** 95th percentile API request duration by effort level; no effort sent -> "default" */
    requestLatencyP95ByEffort: `sort_desc(quantile_over_time(0.95, ${requestsAll} | label_format effort=\`{{ if .effort }}{{ .effort }}{{ else }}default{{ end }}\` | unwrap duration_ms [$__range]) by (effort))`,
    /** Cache write tokens with a 5-minute lifetime */
    cacheWrites5m: `sum(sum_over_time(${requestsAll} | unwrap cache_creation_5m_tokens [$__range]))`,
    /** Cache write tokens with a 1-hour lifetime */
    cacheWrites1h: `sum(sum_over_time(${requestsAll} | unwrap cache_creation_1h_tokens [$__range]))`,

    /** Subagent runs per agent type */
    subagentRuns: `sum by (agent_type) (count_over_time(${subagents} [$__range]))`,
    /** 95th percentile subagent run time per agent type, in ms */
    subagentDurationP95: `quantile_over_time(0.95, ${subagents} | unwrap duration_ms [$__range]) by (agent_type)`,
    /** Average tool calls per subagent run */
    subagentToolUses: `avg_over_time(${subagents} | unwrap total_tool_uses [$__range]) by (agent_type)`,
    /** Share of subagent runs that ran in the background */
    subagentAsyncShare: share(`${subagents} | is_async="true"`, subagents, 'agent_type'),
    /** Share of subagent runs served by more than one model (a mid-run fallback) */
    subagentModelSwapShare: share(`${subagents} | model_swapped="true"`, subagents, 'agent_type'),

    /** Compactions in the period */
    compactions: `sum(count_over_time(${compactions} [$__range]))`,
    /** Share of compactions Claude Code triggered automatically (vs /compact) */
    compactionAutoShare: share(`${compactions} | trigger="auto"`, compactions),
    /** Share of compactions that failed */
    compactionFailureRate: share(`${compactions} | success="false"`, compactions),
    /** Average tokens freed per compaction (pre_tokens - post_tokens) */
    compactionTokensReclaimed: `(sum(sum_over_time(${compactions} | unwrap pre_tokens [$__range])) - sum(sum_over_time(${compactions} | unwrap post_tokens [$__range]))) / sum(count_over_time(${compactions} [$__range]))`,

    /** Skill activations per skill; user-defined and third-party skills show as custom_skill */
    skillActivations: `sort_desc(sum by (skill_name) (count_over_time(${skills} [$__range])))`,
    /** Skill activations by trigger: user-slash, claude-proactive or nested-skill */
    skillTriggers: `sort_desc(sum by (invocation_trigger) (count_over_time(${skills} [$__range])))`,

    /** MCP server connection events by status: connected, failed or disconnected */
    mcpConnections: `sort_desc(sum by (status) (count_over_time(${mcp} [$__range])))`,
    /** Failed MCP connections by error code */
    mcpFailures: `sort_desc(sum by (error_code) (count_over_time(${mcp} | status="failed" | label_format error_code=\`{{ if .error_code }}{{ .error_code }}{{ else }}Unknown{{ end }}\` [$__range])))`,

    /** Hook runs per hook event (one event covers all matching hooks) */
    hookRuns: `sum by (hook_event) (count_over_time(${hooks} [$__range]))`,
    /** 95th percentile time in hooks per hook event, in ms */
    hookDurationP95: `quantile_over_time(0.95, ${hooks} | unwrap total_duration_ms [$__range]) by (hook_event)`,
    /** Hooks that returned a blocking decision, per hook event */
    hookBlocking: `sum by (hook_event) (sum_over_time(${hooks} | unwrap num_blocking [$__range]))`,
    /** Hooks that failed without blocking, per hook event */
    hookErrors: `sum by (hook_event) (sum_over_time(${hooks} | unwrap num_non_blocking_error [$__range]))`,

    // ---------- Security ----------

    /** Switches to bypassPermissions or auto mode */
    escalations: `sum(count_over_time(${escalations} [$__range])) or sum(count_over_time(${modeChanges} [$__range])) * 0`,
    /** Escalations per team member */
    escalationsByMember: `sort_desc(sum by (member) (count_over_time(${escalations} | label_format member=\`${MEMBER_TEMPLATE}\` [$__range])))`,
    /** Permission mode changes as "from -> to" */
    modeChanges: `sort_desc(sum by (change) (count_over_time(${modeChanges} | label_format change=\`{{ .from_mode }} → {{ .to_mode }}\` [$__range])))`,

    /** Tool decisions by the permission mode the check ran in */
    decisionsByMode: `sort_desc(sum by (permission_mode) (count_over_time(${decisions} | permission_mode!="" [$__range])))`,
    /** Auto mode classifier verdicts: allow, block, no_verdict or unavailable */
    classifierVerdicts: `sort_desc(sum by (classifier_verdict) (count_over_time(${decisions} | classifier_verdict!="" [$__range])))`,
    /** Classifier blocks by rule; the rule is only sent with OTEL_LOG_TOOL_DETAILS=1 */
    classifierBlocks: `sort_desc(sum by (classifier_category) (count_over_time(${decisions} | classifier_verdict="block" | label_format classifier_category=\`{{ if .classifier_category }}{{ .classifier_category }}{{ else }}Rule not sent{{ end }}\` [$__range])))`,
    /** Rejected tool calls by who rejected them: config (rules, policy, mode, classifier), hook or the user */
    rejectionsBySource: `sort_desc(sum by (source) (count_over_time(${decisions} | decision="reject" | label_format source=\`${sourceNameOf('source')}\` [$__range])))`,

    /** Failed logins */
    loginFailures: `sum(count_over_time(${auth} | success="false" [$__range])) or sum(count_over_time(${auth} [$__range])) * 0`,
    /** Failed logins and logouts by error category */
    authFailuresByCategory: `sort_desc(sum by (error_category) (count_over_time(${auth} | success="false" | label_format error_category=\`{{ if .error_category }}{{ .error_category }}{{ else }}Unknown{{ end }}\` [$__range])))`,

    /** Plugins installed from marketplaces that aren't official Anthropic ones */
    unofficialPluginInstalls: `sum(count_over_time(${pluginInstalls} | marketplace_is_official="false" [$__range])) or sum(count_over_time(${pluginInstalls} [$__range])) * 0`,
    /** Plugin installs by official vs unofficial marketplace */
    pluginInstallsByMarketplace: `sort_desc(sum by (marketplace) (count_over_time(${pluginInstalls} | label_format marketplace=\`{{ if eq .marketplace_is_official "true" }}Official{{ else }}Unofficial{{ end }}\` [$__range])))`,

    /** Sessions that a managed settings policy stopped */
    refusedSessions: `sum(count_over_time(${managedSettings} | managed_settings_trigger="refused" [$__range])) or sum(count_over_time(${managedSettings} [$__range])) * 0`,
    /** Managed settings policy helper state, from session starts and later changes */
    managedSettingsHelperState: `sort_desc(sum by (managed_settings_helper_state) (count_over_time(${managedSettings} | managed_settings_helper_state!="" [$__range])))`,

    /** Refusals by model */
    refusalsByModel: `sort_desc(sum by (model) (count_over_time(${refusals} [$__range])))`,
  };
}

export type LogQueries = ReturnType<typeof buildLogQueries>;
