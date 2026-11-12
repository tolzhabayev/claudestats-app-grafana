import { PanelBuilders, SceneDataTransformer, SceneFlexItem, SceneFlexLayout, SceneQueryRunner } from '@grafana/scenes';
import { PANEL_HEIGHTS } from '../../constants';
import { LogQueries } from '../logQueries';
import { LOKI, lokiBreakdown, NO_EVENTS } from '../lokiPanels';

// Tool Performance table columns: [refId, column name, query key, unit, decimals].
const COLUMNS = [
  ['Calls', 'Calls', 'toolCalls', 'none', 0],
  ['FailureRate', 'Failure Rate', 'toolFailureRate', 'percent', 1],
  ['P50', 'p50', 'toolLatencyP50', 'ms', 0],
  ['P95', 'p95', 'toolLatencyP95', 'ms', 0],
] as const satisfies ReadonlyArray<readonly [string, string, keyof LogQueries, string, number]>;

/**
 * One row per tool: calls, failure rate and p50/p95 execution time, from
 * `tool_result` events in Loki. Each column is its own instant query; the Loki
 * data source returns each as a table, merged here on `tool_name`.
 */
function toolPerformanceTable(queries: LogQueries) {
  const runner = new SceneQueryRunner({
    datasource: LOKI,
    queries: COLUMNS.map(([refId, , key]) => ({
      refId: `Tool${refId}`,
      expr: queries[key],
      queryType: 'instant',
    })),
  });

  const data = new SceneDataTransformer({
    $data: runner,
    transformations: [
      { id: 'merge', options: {} },
      {
        id: 'organize',
        options: {
          excludeByName: { Time: true },
          indexByName: Object.fromEntries([
            ['tool_name', 0],
            ...COLUMNS.map(([refId], i) => [`Value #Tool${refId}`, i + 1]),
          ]),
          renameByName: Object.fromEntries([
            ['tool_name', 'Tool'],
            ...COLUMNS.map(([refId, name]) => [`Value #Tool${refId}`, name]),
          ]),
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Tool Performance')
    .setDescription(
      'One row per tool that ran: number of calls, share that failed, and median (p50) and 95th percentile (p95) execution time. Rejected calls never run, so they are not counted here. From tool_result events in Loki.'
    )
    .setData(data)
    .setNoValue(NO_EVENTS)
    .setOption('sortBy', [{ displayName: 'Calls', desc: true }])
    .setOverrides((b) => {
      for (const [, name, , unit, decimals] of COLUMNS) {
        b.matchFieldsWithName(name).overrideUnit(unit).overrideDecimals(decimals);
      }
    })
    .build();
}

/** Rows for the Tools tab: tool execution performance from events in Loki. */
export function toolPerformanceRows(queries: LogQueries) {
  return [
    new SceneFlexLayout({
      direction: 'row',
      height: PANEL_HEIGHTS.LARGE,
      children: [new SceneFlexItem({ body: toolPerformanceTable(queries) })],
    }),
    new SceneFlexLayout({
      direction: 'row',
      height: PANEL_HEIGHTS.LARGE,
      children: [
        new SceneFlexItem({
          body: lokiBreakdown(
            'ToolErrorTypes',
            queries.toolErrorTypes,
            'error_type',
            'Failures by Error Type',
            'Failed tool calls by error category, such as Error:ENOENT or ShellError. The full message needs OTEL_LOG_TOOL_DETAILS=1 and is not shown here.'
          ),
        }),
        new SceneFlexItem({
          body: lokiBreakdown(
            'ToolLatencyBySource',
            queries.toolLatencyP95BySource,
            'decision_source',
            'p95 Execution Time by Decision Source',
            '95th percentile tool execution time by who allowed the call: a config rule or hook (automatic) or the user.',
            'ms'
          ),
        }),
      ],
    }),
  ];
}
