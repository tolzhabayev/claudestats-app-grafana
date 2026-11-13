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
import { ACTIVE_TIME_TYPE_NAMES, changeVsPrevious, previousPeriod, QUERIES, Queries } from '../queries';
import { fitHeightToRows, hideWhileEmpty } from '../fitToData';
import { OVER_TIME_MIN_STEP, OVER_TIME_QUERY_OPTIONS, overTimeBars } from '../panelStyle';
import { LABELS, PANEL_HEIGHTS } from '../../constants';
import { teamLeaderboard } from './leaderboard';
import { withEmptyHint } from '../HintWhenEmpty';

/** A single-value stat for an efficiency ratio. */
// The totals compared against the previous period of the same length.
const TRENDS = [
  ['TotalCostChange', 'Cost', 'totalCost'],
  ['TotalTokensChange', 'Tokens', 'totalTokens'],
  ['TotalSessionsChange', 'Sessions', 'totalSessions'],
  ['ActiveUsersChange', 'Active Users', 'activeUsers'],
] as const;

/**
 * The change of one total against the previous period of the same length,
 * such as the 7 days before the last 7 days. One small stat per total, each
 * under its total, so an empty comparison keeps its slot and its own message.
 */
function trendStat(refId: string, name: string, expr: string) {
  return PanelBuilders.stat()
    .setTitle(`${name} vs Previous Period`)
    .setDescription(
      `How ${name.toLowerCase()} compares with the previous period of the same length, such as the 7 days before the last 7 days. Empty when the previous period had none.`
    )
    .setUnit('percent')
    .setDecimals(0)
    .setData(
      new SceneQueryRunner({
        datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
        queries: [{ refId, expr: changeVsPrevious(expr), instant: true }],
      })
    )
    .setOption('graphMode', BigValueGraphMode.None)
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .setNoValue('No previous period')
    .build();
}

function ratioStat(refId: string, expr: string, title: string, unit: string, description: string) {
  return PanelBuilders.stat()
    .setTitle(title)
    .setDescription(description)
    .setUnit(unit)
    .setDecimals(unit === 'percent' ? 1 : 2)
    .setData(
      new SceneQueryRunner({
        datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
        queries: [{ refId, expr, instant: true }],
      })
    )
    .setOption('graphMode', BigValueGraphMode.None)
    .setColor({ mode: 'fixed', fixedColor: 'text' })
    .build();
}

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
        interval: OVER_TIME_MIN_STEP,
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
        interval: OVER_TIME_MIN_STEP,
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
        interval: OVER_TIME_MIN_STEP,
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
  const usageByEntrypointQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByEntrypoint',
        expr: queries.usageByEntrypoint,
        legendFormat: `{{${LABELS.ENTRYPOINT}}}`,
        instant: true,
      },
    ],
  });
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

  // Change of the totals against the previous period. Hidden while the previous
  // period has no cost, since every panel in it would say "No previous period".
  const trendRow = new SceneFlexLayout({
    direction: 'row',
    height: 80,
    children: TRENDS.map(([refId, name, key]) => new SceneFlexItem({ body: trendStat(refId, name, queries[key]) })),
  });
  const previousPeriodCost = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [{ refId: 'PreviousPeriodCost', expr: previousPeriod(queries.totalCost), instant: true }],
  });

  const leaderboard = teamLeaderboard(queries, variables);
  const leaderboardRow = new SceneFlexLayout({
    direction: 'row',
    height: PANEL_HEIGHTS.LARGE,
    children: [new SceneFlexItem({ body: leaderboard.panel })],
    $behaviors: [fitHeightToRows(leaderboard.data, PANEL_HEIGHTS.LARGE)],
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $behaviors: [previousPeriodCost, hideWhileEmpty(trendRow, previousPeriodCost)],
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
        // Row 1a: Change of the totals against the previous period
        trendRow,
        // Row 1b: Efficiency ratios
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: ratioStat(
                'CacheHitRate',
                queries.cacheHitRate,
                'Cache Hit Rate',
                'percent',
                'Share of prompt tokens read from the prompt cache: cacheRead / (input + cacheRead + cacheCreation). Cache reads cost much less than input, so this is the main cost lever.'
              ),
            }),
            new SceneFlexItem({
              body: ratioStat(
                'CostPerSession',
                queries.costPerSession,
                'Cost per Session',
                'currencyUSD',
                'Estimated cost divided by the number of sessions in the period. Launches of the claude agents dashboard are not counted as sessions.'
              ),
            }),
            new SceneFlexItem({
              body: ratioStat(
                'CostPerActiveHour',
                queries.costPerActiveHour,
                'Cost per Active Hour',
                'currencyUSD',
                'Estimated cost divided by active time (User plus CLI) in hours. Active time is not recorded per model, so with a Model filter this compares that model with all active time.'
              ),
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
                  'Estimated cost per interval, one series per model. Each bar is an estimate for one interval.'
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
        // Row 2b: Team leaderboard, as tall as its rows
        leaderboardRow,
        // Row 3: Token and Session Charts
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '40%',
              body: overTimeBars()
                .setTitle('Token Usage Over Time')
                .setDescription('Tokens per interval, stacked by token type. Each bar is an estimate for one interval.')
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
                  'Active time per interval, stacked as User (interaction, such as typing) and CLI (running tools and generating responses). Each bar is an estimate for one interval.'
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
        // Row 4: Environment (adoption details, so a slimmer row at the bottom)
        new SceneFlexLayout({
          direction: 'row',
          height: 170,
          children: [
            new SceneFlexItem({
              width: '20%',
              body: PanelBuilders.piechart()
                .setTitle('OS Type')
                .setDescription('Usage split by operating system, weighted by cost.')
                .setData(usageByOsTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '20%',
              body: PanelBuilders.piechart()
                .setTitle('Architecture')
                .setDescription('Usage split by host architecture, weighted by cost.')
                .setData(usageByHostArchQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '20%',
              body: PanelBuilders.piechart()
                .setTitle('Terminal')
                .setDescription('Usage split by terminal type, weighted by cost.')
                .setData(usageByTerminalTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '20%',
              body: PanelBuilders.piechart()
                .setTitle('Claude Code Version')
                .setDescription('Usage split by Claude Code version, weighted by cost.')
                .setData(usageByServiceVersionQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '20%',
              body: withEmptyHint(
                PanelBuilders.piechart()
                  .setTitle('Surface')
                  .setDescription(
                    'Usage split by where Claude Code ran: the CLI, the VS Code extension, the desktop app or the SDK, weighted by cost. Needs OTEL_METRICS_INCLUDE_ENTRYPOINT=true.'
                  )
                  .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                  .setOption('pieType', 'donut' as never)
                  .build(),
                usageByEntrypointQuery,
                // The setting name doesn't fit the narrow panel, so it's in the description.
                'Needs the entrypoint setting. See the panel info.'
              ),
            }),
          ],
        }),
      ],
    }),
  });
}
