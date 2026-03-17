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
import { QUERIES, Queries } from '../queries';
import { PANEL_HEIGHTS } from '../../constants';

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
    queries: [
      {
        refId: 'CostOverTime',
        expr: queries.costOverTime,
        legendFormat: '{{model}}',
      },
    ],
  });

  const costOverTimeByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostOverTimeByMember',
        expr: queries.costOverTimeByMember,
        legendFormat: '{{user_email}}',
      },
    ],
  });

  const costByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CostByMember',
        expr: queries.costByMember,
        legendFormat: '{{user_email}}',
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
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Total Cost')
                .setUnit('currencyUSD')
                .setData(totalCostQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ mode: 'thresholds' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.piechart()
                .setTitle('Cost by Model')
                .setUnit('currencyUSD')
                .setData(costByModelQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
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
              body: PanelBuilders.timeseries()
                .setTitle('Cost Over Time by Model')
                .setUnit('currencyUSD')
                .setData(costOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .setCustomFieldConfig('fillOpacity', 30)
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.timeseries()
                .setTitle('Cost Over Time by Team Member')
                .setUnit('currencyUSD')
                .setData(costOverTimeByMemberQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .setCustomFieldConfig('fillOpacity', 30)
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
                .setUnit('currencyUSD')
                .setData(costByMemberQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '60%',
              body: PanelBuilders.table()
                .setTitle('Cost Breakdown')
                .setData(costTableQuery)
                .setOption('sortBy', [{ displayName: 'Value', desc: true }])
                .setOverrides((b) =>
                  b.matchFieldsWithName('user_email').overrideDisplayName('Team Member')
                )
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
