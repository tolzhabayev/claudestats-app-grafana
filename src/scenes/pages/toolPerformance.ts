import { SceneFlexItem, SceneFlexLayout } from '@grafana/scenes';
import { PANEL_HEIGHTS } from '../../constants';
import { LogQueries } from '../logQueries';
import { lokiBreakdown, lokiTable } from '../lokiPanels';

/** Rows for the Tools tab: tool execution performance from `tool_result` events in Loki. */
export function toolPerformanceRows(queries: LogQueries) {
  return [
    new SceneFlexLayout({
      direction: 'row',
      height: PANEL_HEIGHTS.LARGE,
      children: [
        new SceneFlexItem({
          body: lokiTable(
            'Tool Performance',
            'One row per tool that ran: number of calls, share that failed, and median (p50) and 95th percentile (p95) execution time. Rejected calls never run, so they are not counted here. From tool_result events in Loki.',
            'tool_name',
            'Tool',
            [
              { refId: 'ToolCalls', name: 'Calls', expr: queries.toolCalls, unit: 'none', decimals: 0 },
              {
                refId: 'ToolFailureRate',
                name: 'Failure Rate',
                expr: queries.toolFailureRate,
                unit: 'percent',
                decimals: 1,
              },
              { refId: 'ToolP50', name: 'p50', expr: queries.toolLatencyP50, unit: 'ms', decimals: 1 },
              { refId: 'ToolP95', name: 'p95', expr: queries.toolLatencyP95, unit: 'ms', decimals: 1 },
            ],
            'No tool results in this period.'
          ),
        }),
      ],
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
            'Failed tool calls by error category, such as Error:ENOENT or ShellError. The full message needs OTEL_LOG_TOOL_DETAILS=1 and is not shown here.',
            'none',
            'No tool call failed in this period.'
          ),
        }),
        new SceneFlexItem({
          body: lokiBreakdown(
            'ToolLatencyBySource',
            queries.toolLatencyP95BySource,
            'decision_source',
            'p95 Execution Time by Decision Source',
            '95th percentile tool execution time by who allowed the call: a config rule or hook (automatic) or the user.',
            'ms',
            'No tool results in this period.'
          ),
        }),
      ],
    }),
  ];
}
