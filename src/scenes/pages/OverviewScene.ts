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
import { BigValueGraphMode, LegendDisplayMode, StackingMode } from '@grafana/schema';
import { QUERIES } from '../queries';
import { PANEL_HEIGHTS } from '../../constants';

export function getOverviewScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet
): EmbeddedScene {
  // Data queries
  const totalCostQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalCost',
        expr: QUERIES.totalCost,
        instant: true,
      },
    ],
  });

  const totalTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalTokens',
        expr: QUERIES.totalTokens,
        instant: true,
      },
    ],
  });

  const totalSessionsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalSessions',
        expr: QUERIES.totalSessions,
        instant: true,
      },
    ],
  });

  const activeUsersQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveUsers',
        expr: QUERIES.activeUsers,
        instant: true,
      },
    ],
  });

  const costOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostOverTime',
        expr: QUERIES.costOverTime,
        legendFormat: '{{model}}',
      },
    ],
  });

  const costByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostByMember',
        expr: QUERIES.costByMember,
        legendFormat: '{{user_email}}',
        instant: true,
      },
    ],
  });

  const tokensOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensOverTime',
        expr: QUERIES.tokensOverTime,
        legendFormat: '{{type}}',
      },
    ],
  });

  const activeTimeOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveTimeOverTime',
        expr: QUERIES.activeTimeOverTime,
      },
    ],
  });

  // Environment queries
  const usageByOsTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'UsageByOsType',
        expr: QUERIES.usageByOsType,
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
        expr: QUERIES.usageByHostArch,
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
        expr: QUERIES.usageByTerminalType,
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
        expr: QUERIES.usageByServiceVersion,
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
                .setUnit('currencyUSD')
                .setData(totalCostQuery)
                .setColor({ mode: 'thresholds' })
                .setOption('graphMode', BigValueGraphMode.None)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Total Tokens')
                .setUnit('short')
                .setData(totalTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Sessions')
                .setUnit('short')
                .setData(totalSessionsQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Active Users')
                .setUnit('short')
                .setData(activeUsersQuery)
                .setOption('graphMode', BigValueGraphMode.None)
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
              body: PanelBuilders.timeseries()
                .setTitle('Cost Over Time')
                .setUnit('currencyUSD')
                .setData(costOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
            new SceneFlexItem({
              width: '40%',
              body: PanelBuilders.piechart()
                .setTitle('Cost by Team Member')
                .setUnit('currencyUSD')
                .setData(costByMemberQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
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
              width: '50%',
              body: PanelBuilders.timeseries()
                .setTitle('Token Usage Over Time')
                .setUnit('short')
                .setData(tokensOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.timeseries()
                .setTitle('Active Time Over Time')
                .setUnit('s')
                .setData(activeTimeOverTimeQuery)
                .setCustomFieldConfig('fillOpacity', 20)
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
                .setData(usageByOsTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Architecture')
                .setData(usageByHostArchQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Terminal')
                .setData(usageByTerminalTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '25%',
              body: PanelBuilders.piechart()
                .setTitle('Claude Code Version')
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
