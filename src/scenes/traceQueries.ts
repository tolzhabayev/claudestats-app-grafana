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
 * Member filter: the email, `enduser.id` or `user.id` matches the selected
 * members. `.attr` looks at both span and resource attributes, and a missing
 * attribute never matches, so the anonymous `user.id` keeps every span
 * selectable under "All".
 */
const MEMBER = '(.user.email =~ "$member" || .enduser.id =~ "$member" || .user.id =~ "$member")';

export function buildTraceQueries() {
  return {
    /** One row per prompt: the interaction root spans, newest first */
    interactions: `{${SERVICE} && name="claude_code.interaction" && ${MEMBER}} | select(span.user_prompt_length, span.interaction.duration_ms)`,

    /** Model requests with their time to first token and duration */
    llmRequests: `{${SERVICE} && name="claude_code.llm_request" && ${MEMBER}} | select(span.model, span.ttft_ms, span.duration_ms, span.stop_reason)`,

    /** The trace picked in the Trace ID variable */
    trace: '$trace',
  };
}

export type TraceQueries = ReturnType<typeof buildTraceQueries>;
