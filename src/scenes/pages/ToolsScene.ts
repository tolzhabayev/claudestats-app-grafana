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
  VariableValueControl,
} from '@grafana/scenes';
import {
  BigValueGraphMode,
  LegendDisplayMode,
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  VizOrientation,
} from '@grafana/schema';
import { DECISION_SOURCE_COLORS, DECISION_SOURCE_NAMES, QUERIES, Queries } from '../queries';
import { getControlsWithoutModel, LOKI_DS_VARIABLE } from '../variables';
import { buildLogQueries, LogQueries } from '../logQueries';
import { toolPerformanceRows } from './toolPerformance';
import { emptyHints } from '../lokiPanels';
import {
  BAR_GAUGE_TEXT,
  horizontalBars,
  OVER_TIME_MIN_STEP,
  OVER_TIME_QUERY_OPTIONS,
  overTimeBars,
} from '../panelStyle';
import { PANEL_HEIGHTS } from '../../constants';

// A low acceptance rate means many proposed edits are rejected, so red/yellow/green
// carry meaning here. The base step (below 0, including no data) stays neutral.
const ACCEPTANCE_RATE_STEPS = [
  { color: 'text', value: -Infinity },
  { color: 'red', value: 0 },
  { color: 'yellow', value: 50 },
  { color: 'green', value: 80 },
];

export function getToolsScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES,
  logQueries: LogQueries = buildLogQueries()
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
    ...OVER_TIME_QUERY_OPTIONS,
    queries: [
      {
        refId: 'ToolDecisionsOverTime',
        interval: OVER_TIME_MIN_STEP,
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

  const none = emptyHints(logQueries.anyEvents);

  return new EmbeddedScene({
    $timeRange: timeRange,
    // The one event check every empty tool performance panel waits for.
    $behaviors: [none.check],
    $variables: variables,
    controls: [
      ...getControlsWithoutModel(variables),
      // Events (Loki) data source for the Tool Performance section.
      new VariableValueControl({ variableName: LOKI_DS_VARIABLE }),
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
          height: PANEL_HEIGHTS.MEDIUM, // room for the pie next to the stat
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Tool Acceptance Rate')
                .setDescription('Percentage of edit decisions that were accepts. Covers Edit, Write and NotebookEdit.')
                .setUnit('percent')
                .setData(toolAcceptanceRateQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setThresholds({
                  mode: 'absolute',
                  // Base step neutral, so "No data" isn't shown in red.
                  steps: ACCEPTANCE_RATE_STEPS,
                } as never)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.piechart()
                .setTitle('Tool Decisions')
                .setDescription(
                  'Accepted and rejected edit decisions in the period. Decisions made by a config rule or hook count too.'
                )
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
              body: overTimeBars()
                .setTitle('Tool Decisions Over Time')
                .setDescription(
                  'Accepted and rejected edit decisions per interval. Each bar is an estimate for one interval.'
                )
                .setUnit('short')
                .setData(toolDecisionsOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
            new SceneFlexItem({
              width: '40%',
              body: horizontalBars()
                .setTitle('Usage by Tool')
                .setDescription('Edit decisions per tool: Edit, Write or NotebookEdit.')
                .setUnit('short')
                .setData(toolDecisionsByToolQuery)
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
                .setOption('text', BAR_GAUGE_TEXT)
                .setOption('valueMode', BarGaugeValueMode.Text)
                .setOption('showUnfilled', true)
                .setOption('minVizWidth', 150)
                .setOption('minVizHeight', 25)
                .setDisplayName('${__series.name}')
                .setThresholds({
                  mode: 'absolute',
                  // Base step neutral, so "No data" isn't shown in red.
                  steps: ACCEPTANCE_RATE_STEPS,
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
        // Rows 4-5: Tool performance from tool_result events (Loki)
        ...toolPerformanceRows(logQueries, none),
      ],
    }),
  });
}
