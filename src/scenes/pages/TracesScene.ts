import {
  EmbeddedScene,
  PanelBuilders,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueControl,
} from '@grafana/scenes';
import { PANEL_HEIGHTS, PLUGIN_BASE_URL, ROUTES } from '../../constants';
import { buildTraceQueries, TraceQueries } from '../traceQueries';
import { TEMPO_DS_VARIABLE, TRACE_VARIABLE } from '../variables';

const TEMPO = { type: 'tempo', uid: `\${${TEMPO_DS_VARIABLE}}` };

/** Shown when Tempo has no Claude Code traces for the period. */
const NO_TRACES = 'No traces. Needs CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 and OTEL_TRACES_EXPORTER=otlp';

function search(refId: string, query: string, tableType: 'traces' | 'spans') {
  return new SceneQueryRunner({
    datasource: TEMPO,
    queries: [{ refId, queryType: 'traceql', query, limit: 50, spss: 20, tableType }],
  });
}

/**
 * Traces (beta): pick a prompt and see what it did end to end: model requests
 * with their time to first token, tool calls, permission waits and tool runs.
 */
export function getTracesScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  q: TraceQueries = buildTraceQueries()
): EmbeddedScene {
  // Clicking a trace keeps every filter and shows that trace below.
  const keep = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => name !== TRACE_VARIABLE)
    .map((name) => `\${${name}:queryparam}`)
    .join('&');
  const openTrace = {
    title: 'Show this trace',
    url: `${PLUGIN_BASE_URL}/${ROUTES.Traces}?\${__url_time_range}&${keep}&var-${TRACE_VARIABLE}=\${__value.raw}`,
  };

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variables,
    controls: [
      new VariableValueControl({ variableName: TEMPO_DS_VARIABLE }),
      new VariableValueControl({ variableName: 'member' }),
      new VariableValueControl({ variableName: TRACE_VARIABLE }),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({ intervals: ['30s', '1m', '5m', '15m', '30m'] }),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.table()
                .setTitle('Interactions')
                .setDescription(
                  'One row per prompt (a claude_code.interaction trace), newest first, with its prompt length and duration. Click a trace ID to show the trace below. The prompt text stays redacted unless OTEL_LOG_USER_PROMPTS=1.'
                )
                .setData(search('Interactions', q.interactions, 'traces'))
                .setNoValue(NO_TRACES)
                .setOverrides((b) => {
                  // Tempo already names the trace ID field "Trace ID", which is what the matcher compares.
                  b.matchFieldsWithName('Trace ID').overrideLinks([openTrace]);
                })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.table()
                .setTitle('Model Requests')
                .setDescription(
                  'Model requests (claude_code.llm_request spans) with their model, time to first token (ttft_ms), duration and stop reason. Click a trace ID to show the trace below.'
                )
                .setData(search('ModelRequests', q.llmRequests, 'spans'))
                .setNoValue(NO_TRACES)
                .setOverrides((b) => {
                  b.matchFieldsWithName('traceIdHidden').overrideDisplayName('Trace ID').overrideLinks([openTrace]);
                })
                .build(),
            }),
          ],
        }),
        new SceneFlexLayout({
          direction: 'row',
          height: 520,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.traces()
                .setTitle('Trace')
                .setDescription(
                  'The trace picked above, as a waterfall: the prompt, its model requests, and each tool call with the time spent waiting for permission and running the tool.'
                )
                .setData(
                  new SceneQueryRunner({
                    datasource: TEMPO,
                    queries: [{ refId: 'Trace', queryType: 'traceql', query: q.trace }],
                  })
                )
                .setNoValue('Click a trace ID above, or enter one in Trace ID, to see the trace.')
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
