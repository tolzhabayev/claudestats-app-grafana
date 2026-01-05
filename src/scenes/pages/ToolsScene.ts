import {
  EmbeddedScene,
  SceneFlexLayout,
  SceneFlexItem,
  SceneQueryRunner,
  SceneTimeRange,
  SceneVariableSet,
  PanelBuilders,
  VariableValueSelectors,
  SceneControlsSpacer,
  SceneTimePicker,
  SceneRefreshPicker,
} from '@grafana/scenes';
import {
  BigValueGraphMode,
  LegendDisplayMode,
  StackingMode,
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  VizOrientation,
} from '@grafana/schema';
import { QUERIES } from '../queries';
import { PANEL_HEIGHTS, LABELS, METRICS } from '../../constants';

export function getToolsScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet
): EmbeddedScene {
  const toolDecisionsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisions',
        expr: QUERIES.toolDecisions,
        legendFormat: '{{decision}}',
        instant: true,
      },
    ],
  });

  const toolDecisionsByToolQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisionsByTool',
        expr: QUERIES.toolDecisionsByTool,
        legendFormat: '{{tool_name}}',
        instant: true,
      },
    ],
  });

  const toolAcceptanceRateQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolAcceptanceRate',
        expr: QUERIES.toolAcceptanceRate,
        instant: true,
      },
    ],
  });

  const toolDecisionsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisionsOverTime',
        expr: `sum(increase(${METRICS.TOOL_DECISION}{${LABELS.USER_EMAIL}=~"$member"}[$__rate_interval])) by (${LABELS.DECISION})`,
        legendFormat: '{{decision}}',
      },
    ],
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variables,
    controls: [
      new VariableValueSelectors({}),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({ intervals: ['30s', '1m', '5m', '15m', '30m'] }),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        // Row 1: Stats
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Tool Acceptance Rate')
                .setUnit('percent')
                .setData(toolAcceptanceRateQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setThresholds({
                  mode: 'absolute',
                  steps: [
                    { color: 'red', value: 0 },
                    { color: 'yellow', value: 50 },
                    { color: 'green', value: 80 },
                  ],
                } as never)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.piechart()
                .setTitle('Tool Decisions')
                .setData(toolDecisionsQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .build(),
            }),
          ],
        }),
        // Row 2: Tool decisions over time and by tool
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '60%',
              body: PanelBuilders.timeseries()
                .setTitle('Tool Decisions Over Time')
                .setUnit('short')
                .setData(toolDecisionsOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .setCustomFieldConfig('fillOpacity', 30)
                .build(),
            }),
            new SceneFlexItem({
              width: '40%',
              body: PanelBuilders.bargauge()
                .setTitle('Usage by Tool')
                .setUnit('short')
                .setData(toolDecisionsByToolQuery)
                .setOption('displayMode', BarGaugeDisplayMode.Gradient)
                .setOption('orientation', VizOrientation.Horizontal)
                .setOption('valueMode', BarGaugeValueMode.Text)
                .setOption('showUnfilled', true)
                .setOption('minVizWidth', 150)
                .setOption('minVizHeight', 25)
                .setDisplayName('${__series.name}')
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
