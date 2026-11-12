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
import { BigValueGraphMode, LegendDisplayMode } from '@grafana/schema';
import { ACTIVE_TIME_TYPE_NAMES, QUERIES, Queries } from '../queries';
import { OVER_TIME_QUERY_OPTIONS, overTimeBars } from '../panelStyle';
import { PANEL_HEIGHTS } from '../../constants';

export function getOverviewScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES
): EmbeddedScene {
  // Data queries
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

  const totalTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalTokens',
        expr: queries.totalTokens,
        instant: true,
      },
    ],
  });

  const totalSessionsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalSessions',
        expr: queries.totalSessions,
        instant: true,
      },
    ],
  });

  const activeUsersQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveUsers',
        expr: queries.activeUsers,
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
        expr: queries.costOverTime,
        legendFormat: '{{model}}',
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

  const tokensOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    ...OVER_TIME_QUERY_OPTIONS,
    queries: [
      {
        refId: 'TokensOverTime',
        expr: queries.tokensOverTime,
        legendFormat: '{{type}}',
      },
    ],
  });

  const activeTimeOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    ...OVER_TIME_QUERY_OPTIONS,
    queries: [
      {
        refId: 'ActiveTimeOverTime',
        expr: queries.activeTimeOverTime,
        legendFormat: '{{type}}',
      },
    ],
  });

  const sessionsByStartTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'SessionsByStartType',
        expr: queries.sessionsByStartType,
        legendFormat: '{{start_type}}',
        instant: true,
      },
    ],
  });

  // Environment queries
  const usageByOsTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByOsType',
        expr: queries.usageByOsType,
        legendFormat: '{{os_type}}',
        instant: true,
      },
    ],
  });

  const usageByHostArchQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByHostArch',
        expr: queries.usageByHostArch,
        legendFormat: '{{host_arch}}',
        instant: true,
      },
    ],
  });

  const usageByTerminalTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByTerminalType',
        expr: queries.usageByTerminalType,
        legendFormat: '{{terminal_type}}',
        instant: true,
      },
    ],
  });

  const usageByServiceVersionQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByServiceVersion',
        expr: queries.usageByServiceVersion,
        legendFormat: '{{service_version}}',
        instant: true,
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
                .setTitle('Total Cost')
                .setDescription('Estimated cost in US dollars, as reported by Claude Code.')
                .setUnit('currencyUSD')
                .setData(totalCostQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ mode: 'fixed', fixedColor: 'blue' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Total Tokens')
                .setDescription('All tokens in the period: input, output, cache reads and cache writes.')
                .setUnit('short')
                .setData(totalTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ mode: 'fixed', fixedColor: 'purple' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Sessions')
                .setDescription(
                  'Distinct Claude Code sessions started in the period. Launches of the claude agents dashboard are not counted.'
                )
                .setUnit('short')
                .setData(totalSessionsQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ mode: 'fixed', fixedColor: 'green' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Active Users')
                .setDescription(
                  'Team members whose Claude Code reported cost data in the period. Usage with no member identity is not counted.'
                )
                .setUnit('short')
                .setData(activeUsersQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ mode: 'fixed', fixedColor: 'orange' })
                .build(),
            }),
          ],
        }),
        // Row 2: Cost Charts
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '60%',
              body: overTimeBars()
                .setTitle('Cost Over Time')
                .setDescription(
                  'Estimated cost per interval, one series per model. Each bar is the total for one interval.'
                )
                .setUnit('currencyUSD')
                .setData(costOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
            new SceneFlexItem({
              width: '40%',
              body: PanelBuilders.piechart()
                .setTitle('Cost by Team Member')
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
                .build(),
            }),
          ],
        }),
        // Row 3: Token and Session Charts
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '40%',
              body: overTimeBars()
                .setTitle('Token Usage Over Time')
                .setDescription('Tokens per interval, stacked by token type. Each bar is the total for one interval.')
                .setUnit('short')
                .setData(tokensOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
            new SceneFlexItem({
              width: '35%',
              body: overTimeBars()
                .setTitle('Active Time Over Time')
                .setDescription(
                  'Active time per interval, stacked as User (interaction, such as typing) and CLI (running tools and generating responses). Each bar is the total for one interval.'
                )
                .setUnit('s')
                .setData(activeTimeOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOverrides((b) => {
                  for (const [type, name] of Object.entries(ACTIVE_TIME_TYPE_NAMES)) {
                    b.matchFieldsWithName(type).overrideDisplayName(name);
                  }
                })
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Sessions by Start Type')
                .setDescription('Sessions by how they started: fresh, resume, continue or agents_view.')
                .setUnit('short')
                .setData(sessionsByStartTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
          ],
        }),
        // Row 4: Environment
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.MEDIUM,
          children: [
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('OS Type')
                .setDescription('Usage split by operating system, weighted by cost.')
                .setData(usageByOsTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Architecture')
                .setDescription('Usage split by host architecture, weighted by cost.')
                .setData(usageByHostArchQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Terminal')
                .setDescription('Usage split by terminal type, weighted by cost.')
                .setData(usageByTerminalTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Claude Code Version')
                .setDescription('Usage split by Claude Code version, weighted by cost.')
                .setData(usageByServiceVersionQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
