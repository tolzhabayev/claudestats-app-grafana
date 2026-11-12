/**
 * TraceQL queries for Claude Code traces in Tempo (beta; needs
 * CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 and OTEL_TRACES_EXPORTER=otlp).
 *
 * Each prompt is a `claude_code.interaction` root span with
 * `claude_code.llm_request` and `claude_code.tool` children.
 */

/** Spans from Claude Code. */
const SERVICE = 'resource.service.name="claude-code"';

/**
 * Member filter with the same identity fallback as the metrics and events: a
 * span belongs to its email, else its `enduser.id`, else its `user.id`. Tempo
 * doesn't support `= nil` yet, so "missing" is written as `!(attr != nil)`.
 * `.attr` looks at both span and resource attributes.
 */
const MEMBER =
  '((.user.email =~ "$member")' +
  ' || (!(.user.email != nil) && .enduser.id =~ "$member")' +
  ' || (!(.user.email != nil) && !(.enduser.id != nil) && .user.id =~ "$member"))';

export function buildTraceQueries() {
  return {
    /** One row per prompt: the interaction root spans, newest first */
    interactions: `{${SERVICE} && name="claude_code.interaction" && ${MEMBER}} | select(span.user_prompt_length, span.interaction.duration_ms)`,

    /** Model requests with their time to first token (Tempo adds each span's duration) */
    llmRequests: `{${SERVICE} && name="claude_code.llm_request" && ${MEMBER}} | select(span.model, span.ttft_ms, span.stop_reason)`,

    /** The trace picked in the Trace ID variable */
    trace: '$trace',
  };
}

export type TraceQueries = ReturnType<typeof buildTraceQueries>;
