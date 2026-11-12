import { LABELS } from '../constants';
import { FilterDimension, getFilterDimensions } from './dimensions';

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

// Counts fall back to 0 only when there are API request events in the period: with
// none at all (events not exported) they stay empty, so the panels can say so.
export function buildLogQueries(dimensions: FilterDimension[] = getFilterDimensions()) {
  const filters = [
    MEMBER_FILTER,
    `${LABELS.MODEL}=~"$model"`,
    ...dimensions.map((d) => `${d.label}=~"$${d.variable}"`),
  ].join(' | ');

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

    /** Refusals by model */
    refusalsByModel: `sort_desc(sum by (model) (count_over_time(${refusals} [$__range])))`,
  };
}

export type LogQueries = ReturnType<typeof buildLogQueries>;
