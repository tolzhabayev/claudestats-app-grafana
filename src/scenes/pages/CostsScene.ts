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
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  LegendDisplayMode,
  VizOrientation,
} from '@grafana/schema';
import { QUERIES, Queries } from '../queries';
import { BAR_GAUGE_COLOR, OVER_TIME_MIN_STEP, OVER_TIME_QUERY_OPTIONS, overTimeBars } from '../panelStyle';
import { PANEL_HEIGHTS } from '../../constants';

/**
 * A horizontal bar gauge with one bar per attribution bucket, mirroring the
 * "Usage by Tool" gauge on the Tools page. The query is a plain instant
 * multi-series vector (`sort_desc(...)` in PromQL puts the biggest bucket
 * first); `legendFormat` names each series after `labelKey`, and
 * `${__series.name}` surfaces that name as the bar label.
 */
function attributionBarGauge(
  refId: string,
  expr: string,
  labelKey: string,
  title: string,
  unit: string,
  {
    legendFormat = `{{${labelKey}}}`,
    noValue,
    description,
  }: {
    /** Series name, when it's built from more than `labelKey`. */
    legendFormat?: string;
    /** Shown instead of "No data", to say what the panel needs. */
    noValue?: string;
    /** Panel description, shown as an (i) icon next to the title. */
    description?: string;
  } = {}
) {
  const data = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [{ refId, expr, legendFormat, instant: true }],
  });

  return PanelBuilders.bargauge()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setData(data)
    .setOption('displayMode', BarGaugeDisplayMode.Gradient)
    .setColor(BAR_GAUGE_COLOR)
    .setOption('orientation', VizOrientation.Horizontal)
    .setOption('valueMode', BarGaugeValueMode.Text)
    .setOption('showUnfilled', true)
    .setOption('minVizWidth', 150)
    .setOption('minVizHeight', 25)
    .setDisplayName('${__series.name}')
    .setNoValue(noValue)
    .build();
}

// Repository attributes are off by default, so an empty panel usually means they aren't sent.
const REPOSITORY_HINT = 'No data. Needs OTEL_METRICS_INCLUDE_REPOSITORY=true';

export function getCostsScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES
): EmbeddedScene {
  const totalCostQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalCost',
        expr: queries.totalCost,
        instant: true,
      },
    ],
  });

  const costByModelQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostByModel',
        expr: queries.costByModel,
        legendFormat: '{{model}}',
        instant: true,
      },
    ],
  });

  const costOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    ...OVER_TIME_QUERY_OPTIONS,
    queries: [
      {
        refId: 'CostOverTime',
        interval: OVER_TIME_MIN_STEP,
        expr: queries.costOverTime,
        legendFormat: '{{model}}',
      },
    ],
  });

  const costOverTimeByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    ...OVER_TIME_QUERY_OPTIONS,
    queries: [
      {
        refId: 'CostOverTimeByMember',
        interval: OVER_TIME_MIN_STEP,
        expr: queries.costOverTimeByMember,
        legendFormat: '{{member}}',
      },
    ],
  });

  const costByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostByMember',
        expr: queries.costByMember,
        legendFormat: '{{member}}',
        instant: true,
      },
    ],
  });

  const costTableQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostTable',
        expr: queries.costTable,
        instant: true,
        format: 'table',
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
          height: PANEL_HEIGHTS.MEDIUM, // room for the pie next to the stat
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Total Cost')
                .setDescription('Estimated cost in US dollars, as reported by Claude Code.')
                .setUnit('currencyUSD')
                .setData(totalCostQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ mode: 'fixed', fixedColor: 'blue' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.piechart()
                .setTitle('Cost by Model')
                .setDescription(
                  "Each model's share of estimated cost. Shows every model regardless of the Model filter."
                )
                .setUnit('currencyUSD')
                .setData(costByModelQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .build(),
            }),
          ],
        }),
        // Row 2: Time series charts
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: overTimeBars()
                .setTitle('Cost Over Time by Model')
                .setDescription(
                  'Estimated cost per interval, one series per model. Each bar is the total for one interval.'
                )
                .setUnit('currencyUSD')
                .setData(costOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: overTimeBars()
                .setTitle('Cost Over Time by Team Member')
                .setDescription(
                  'Estimated cost per interval, one series per team member. Each bar is the total for one interval.'
                )
                .setUnit('currencyUSD')
                .setData(costOverTimeByMemberQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
          ],
        }),
        // Row 3: Pie chart and table
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '40%',
              body: PanelBuilders.piechart()
                .setTitle('Cost Distribution by Member')
                .setDescription(
                  "Each member's share of estimated cost. Shows every member regardless of the Team Member filter."
                )
                .setUnit('currencyUSD')
                .setData(costByMemberQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '60%',
              body: PanelBuilders.table()
                .setTitle('Cost Breakdown')
                .setDescription('Estimated cost per team member and model, in US dollars.')
                .setData(costTableQuery)
                .setOption('sortBy', [{ displayName: 'Value', desc: true }])
                .setOverrides((b) => b.matchFieldsWithName('member').overrideDisplayName('Team Member'))
                .build(),
            }),
          ],
        }),
        // Row 4: Cost attribution by query source and subagent
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByQuerySource',
                queries.costByQuerySource,
                'query_source',
                'Cost by Query Source',
                'currencyUSD',
                { description: 'Estimated cost by what issued the request: main conversation, subagent or auxiliary.' }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByAgent',
                queries.costByAgent,
                'agent_name',
                'Cost by Subagent',
                'currencyUSD',
                {
                  description:
                    'Estimated cost by the subagent type that issued the request. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 5: Cost attribution by skill and MCP server
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostBySkill',
                queries.costBySkill,
                'skill_name',
                'Cost by Skill',
                'currencyUSD',
                {
                  description:
                    'Estimated cost by the skill that was active. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByMcpServer',
                queries.costByMcpServer,
                'mcp_server_name',
                'Cost by MCP Server',
                'currencyUSD',
                {
                  description:
                    'Estimated cost by the MCP server whose tool result the request used. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 6: Cost attribution by plugin and MCP tool
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByPlugin',
                queries.costByPlugin,
                'plugin_name',
                'Cost by Plugin',
                'currencyUSD',
                {
                  description:
                    'Estimated cost by the plugin that owns the active skill or subagent. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByMcpTool',
                queries.costByMcpTool,
                'mcp_tool_name',
                'Cost by MCP Tool',
                'currencyUSD',
                {
                  legendFormat: '{{mcp_server_name}} / {{mcp_tool_name}}',
                  description:
                    'Estimated cost by MCP tool, shown as server / tool, for requests that used an MCP tool result. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 7: Cost attribution by speed (fast mode) and effort
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostBySpeed',
                queries.costBySpeed,
                'speed',
                'Cost by Speed (Fast Mode)',
                'currencyUSD',
                { description: 'Estimated cost by request speed: fast for fast mode, normal otherwise.' }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'CostByEffort',
                queries.costByEffort,
                'effort',
                'Cost by Effort',
                'currencyUSD',
                { description: 'Estimated cost by effort level, or default when the model does not use one.' }
              ),
            }),
          ],
        }),
        // Row 8: Cost attribution by repository
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '100%',
              body: attributionBarGauge(
                'CostByRepository',
                queries.costByRepository,
                'vcs_repository_name',
                'Cost by Repository',
                'currencyUSD',
                {
                  noValue: REPOSITORY_HINT,
                  description:
                    'Estimated cost by the Git repository Claude Code was working in. Needs OTEL_METRICS_INCLUDE_REPOSITORY=true.',
                }
              ),
            }),
          ],
        }),
      ],
    }),
  });
}
