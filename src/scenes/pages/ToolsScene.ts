import {
  EmbeddedScene,
  SceneFlexLayout,
  SceneFlexItem,
  SceneQueryRunner,
  SceneTimeRange,
  SceneVariableSet,
  PanelBuilders,
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
import { DECISION_SOURCE_COLORS, DECISION_SOURCE_NAMES, QUERIES, Queries } from '../queries';
import { getControlsWithoutModel } from '../variables';
import { PANEL_HEIGHTS } from '../../constants';

export function getToolsScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES
): EmbeddedScene {
  const toolDecisionsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisions',
        expr: queries.toolDecisions,
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
        expr: queries.toolDecisionsByTool,
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
        expr: queries.toolAcceptanceRate,
        instant: true,
      },
    ],
  });

  const toolDecisionsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisionsOverTime',
        expr: queries.toolDecisionsOverTime,
        legendFormat: '{{decision}}',
      },
    ],
  });

  const toolAcceptanceRateByLanguageQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolAcceptanceRateByLanguage',
        expr: queries.toolAcceptanceRateByLanguage,
        legendFormat: '{{language}}',
        instant: true,
      },
    ],
  });

  const toolDecisionsBySourceQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ToolDecisionsBySource',
        expr: queries.toolDecisionsBySource,
        legendFormat: '{{source}}',
        instant: true,
      },
    ],
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variables,
    controls: [
      ...getControlsWithoutModel(),
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
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
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
        // Row 3: Acceptance by language and who decides
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '55%',
              body: PanelBuilders.bargauge()
                .setTitle('Acceptance Rate by Language')
                .setDescription(
                  'Share of edit decisions that were accepts, per file language. A language with only a few decisions can swing between 0% and 100%.'
                )
                .setUnit('percent')
                .setMin(0)
                .setMax(100)
                .setData(toolAcceptanceRateByLanguageQuery)
                .setOption('displayMode', BarGaugeDisplayMode.Gradient)
                .setOption('orientation', VizOrientation.Horizontal)
                .setOption('valueMode', BarGaugeValueMode.Text)
                .setOption('showUnfilled', true)
                .setOption('minVizWidth', 150)
                .setOption('minVizHeight', 25)
                .setDisplayName('${__series.name}')
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
              width: '45%',
              body: PanelBuilders.piechart()
                .setTitle('Decisions by Source')
                .setDescription(
                  'Who made each edit decision: a config rule or hook (automatic), or the user at the permission prompt.'
                )
                .setUnit('short')
                .setData(toolDecisionsBySourceQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .setOverrides((b) => {
                  for (const [source, name] of Object.entries(DECISION_SOURCE_NAMES)) {
                    b.matchFieldsWithName(source)
                      .overrideDisplayName(name)
                      .overrideColor({
                        mode: 'fixed',
                        fixedColor: DECISION_SOURCE_COLORS[source as keyof typeof DECISION_SOURCE_NAMES],
                      });
                  }
                })
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
