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
import {
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  BigValueGraphMode,
  LegendDisplayMode,
  VizOrientation,
} from '@grafana/schema';
import { PANEL_HEIGHTS } from '../../constants';
import { buildLogQueries, LogQueries } from '../logQueries';
import { BAR_GAUGE_COLOR, OVER_TIME_QUERY_OPTIONS, overTimeBars } from '../panelStyle';
import { OptionalVariableControl } from '../OptionalVariableControl';
import { LOKI_DS_VARIABLE } from '../variables';

const LOKI = { type: 'loki', uid: `\${${LOKI_DS_VARIABLE}}` };

/** Shown instead of "No data" when Loki has no Claude Code events for the period. */
const NO_EVENTS = 'No events. Needs OTEL_LOGS_EXPORTER=otlp';

function runner(refId: string, expr: string, opts: { instant?: boolean; legendFormat?: string } = {}) {
  return new SceneQueryRunner({
    datasource: LOKI,
    ...(opts.instant ? {} : OVER_TIME_QUERY_OPTIONS),
    queries: [
      {
        refId,
        expr,
        queryType: opts.instant ? 'instant' : 'range',
        ...(opts.legendFormat ? { legendFormat: opts.legendFormat } : {}),
      },
    ],
  });
}

function countStat(refId: string, expr: string, title: string, description: string, unit = 'none') {
  return PanelBuilders.stat()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setDecimals(unit === 'percent' ? 1 : 0)
    .setData(runner(refId, expr, { instant: true }))
    .setOption('graphMode', BigValueGraphMode.None)
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .setNoValue(NO_EVENTS)
    .build();
}

function breakdown(refId: string, expr: string, label: string, title: string, description: string) {
  return PanelBuilders.bargauge()
    .setTitle(title)
    .setDescription(description)
    .setUnit('none')
    .setDecimals(0)
    .setData(runner(refId, expr, { instant: true, legendFormat: `{{${label}}}` }))
    .setOption('displayMode', BarGaugeDisplayMode.Gradient)
    .setColor(BAR_GAUGE_COLOR)
    .setOption('orientation', VizOrientation.Horizontal)
    .setOption('valueMode', BarGaugeValueMode.Text)
    .setOption('showUnfilled', true)
    .setOption('minVizWidth', 150)
    .setOption('minVizHeight', 25)
    .setDisplayName('${__series.name}')
    .build();
}

/**
 * Reliability: API errors, retry exhaustion and refusals, from the events
 * Claude Code sends as OTel logs to Loki. The pickers are the events data
 * source plus the usual filters; there are no metrics on this tab.
 */
export function getReliabilityScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: LogQueries = buildLogQueries()
): EmbeddedScene {
  const dimensionNames = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => !['prometheus_ds', LOKI_DS_VARIABLE, 'member', 'model'].includes(name));

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variables,
    controls: [
      new VariableValueControl({ variableName: LOKI_DS_VARIABLE }),
      new VariableValueControl({ variableName: 'member' }),
      new VariableValueControl({ variableName: 'model' }),
      ...dimensionNames.map((variableName) => new OptionalVariableControl({ variableName })),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({ intervals: ['30s', '1m', '5m', '15m', '30m'] }),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        // Row 1: Totals
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: countStat(
                'ApiErrors',
                queries.apiErrors,
                'API Errors',
                'API requests that failed after Claude Code gave up retrying. Each error is counted once, with its final attempt.'
              ),
            }),
            new SceneFlexItem({
              body: countStat(
                'ErrorRate',
                queries.errorRate,
                'Error Rate',
                'API errors as a share of all API requests, failed and successful.',
                'percent'
              ),
            }),
            new SceneFlexItem({
              body: countStat(
                'RetriesExhausted',
                queries.retriesExhausted,
                'Retries Exhausted',
                'Requests that still failed after more than one attempt.'
              ),
            }),
            new SceneFlexItem({
              body: countStat(
                'Refusals',
                queries.refusals,
                'Refusals',
                'Responses the model refused, which do not show up as API errors. Refusals the API already retried on another model are left out, because the user never saw them.'
              ),
            }),
          ],
        }),
        // Row 2: Errors over time
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: overTimeBars()
                .setTitle('API Errors Over Time')
                .setDescription(
                  'API errors per interval, stacked by HTTP status code. Timeouts and connection failures have no status code and show as No status.'
                )
                .setUnit('none')
                .setData(runner('ApiErrorsOverTime', queries.errorsOverTime, { legendFormat: '{{status_code}}' }))
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
          ],
        }),
        // Row 3: Error breakdowns
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: breakdown('ErrorsByModel', queries.errorsByModel, 'model', 'Errors by Model', 'API errors per model.'),
            }),
            new SceneFlexItem({
              body: breakdown(
                'ErrorsByAttempt',
                queries.errorsByAttempt,
                'attempt',
                'Errors by Attempts',
                'API errors by how many attempts were made, including the first request. By default Claude Code gives up after 11.'
              ),
            }),
          ],
        }),
        // Row 4: Refusals
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: breakdown(
                'RefusalsByCategory',
                queries.refusalsByCategory,
                'category',
                'Refusals by Category',
                'Refusals the user saw, by category: cyber, bio, frontier_llm or reasoning_extraction. Claude Code sends the category only with OTEL_LOG_TOOL_DETAILS=1.'
              ),
            }),
            new SceneFlexItem({
              body: breakdown(
                'RefusalsByModel',
                queries.refusalsByModel,
                'model',
                'Refusals by Model',
                'Refusals the user saw, per model.'
              ),
            }),
          ],
        }),
      ],
    }),
  });
}
