import {
  EmbeddedScene,
  PanelBuilders,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneDataTransformer,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueControl,
} from '@grafana/scenes';
import type { CustomTransformOperator } from '@grafana/data';
import { PANEL_HEIGHTS, PLUGIN_BASE_URL, ROUTES } from '../../constants';
import { buildTraceQueries, TraceQueries } from '../traceQueries';
import { interactionColumns, modelRequestColumns } from '../traceTables';
import { TEMPO_DS_VARIABLE, TRACE_VARIABLE } from '../variables';
import { WhenVariableSet } from '../WhenVariableSet';

const TEMPO = { type: 'tempo', uid: `\${${TEMPO_DS_VARIABLE}}` };

/** Shown when Tempo has no Claude Code traces for the period. */
const TRACE_DESCRIPTION =
  'The trace picked above, as a waterfall: the prompt, its model requests, and each tool call with the time spent waiting for permission and running the tool.';

/** Shown in place of the waterfall until a trace is picked. */
const PICK_A_TRACE = 'Click a trace ID above, or enter one in **Trace ID**, to see the trace.';

const NO_TRACES = 'No traces. Needs CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 and OTEL_TRACES_EXPORTER=otlp';

function search(refId: string, query: string, tableType: 'traces' | 'spans', columns: CustomTransformOperator) {
  return new SceneDataTransformer({
    $data: new SceneQueryRunner({
      datasource: TEMPO,
      queries: [{ refId, queryType: 'traceql', query, limit: 50, spss: 20, tableType }],
    }),
    transformations: [columns],
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
              width: '40%',
              body: PanelBuilders.table()
                .setTitle('Interactions')
                .setDescription(
                  'One row per prompt (a claude_code.interaction trace), newest first, with its prompt length and duration. Click a trace ID to show the trace below. The prompt text stays redacted unless OTEL_LOG_USER_PROMPTS=1.'
                )
                .setData(search('Interactions', q.interactions, 'traces', interactionColumns))
                .setNoValue(NO_TRACES)
                .setOverrides((b) => {
                  // Tempo already names the trace ID field "Trace ID", which is what the matcher compares.
                  b.matchFieldsWithName('Trace ID').overrideLinks([openTrace]);
                })
                .build(),
            }),
            new SceneFlexItem({
              width: '60%',
              body: PanelBuilders.table()
                .setTitle('Model Requests')
                .setDescription(
                  'Model requests (claude_code.llm_request spans) with their model, time to first token, duration and stop reason. Click a trace ID to show the trace below.'
                )
                .setData(search('ModelRequests', q.llmRequests, 'spans', modelRequestColumns))
                .setNoValue(NO_TRACES)
                .setOverrides((b) => {
                  // modelRequestColumns shows Tempo's hidden trace ID column as "Trace ID".
                  b.matchFieldsWithName('Trace ID').overrideLinks([openTrace]);
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
              // Only query Tempo once a trace is picked: it rejects an empty trace query.
              body: new WhenVariableSet({
                variableName: TRACE_VARIABLE,
                body: PanelBuilders.traces()
                  .setTitle('Trace')
                  .setDescription(TRACE_DESCRIPTION)
                  .setData(
                    new SceneQueryRunner({
                      datasource: TEMPO,
                      queries: [{ refId: 'Trace', queryType: 'traceql', query: q.trace }],
                    })
                  )
                  .build(),
                placeholder: PanelBuilders.text()
                  .setTitle('Trace')
                  .setDescription(TRACE_DESCRIPTION)
                  .setOption('content', PICK_A_TRACE)
                  .build(),
              }),
            }),
          ],
        }),
      ],
    }),
  });
}
