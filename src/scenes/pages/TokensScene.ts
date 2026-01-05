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
} from '@grafana/schema';
import { QUERIES } from '../queries';
import { PANEL_HEIGHTS, LABELS, METRICS } from '../../constants';

export function getTokensScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet
): EmbeddedScene {
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

  const inputTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'InputTokens',
        expr: `sum(${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="input"})`,
        instant: true,
      },
    ],
  });

  const outputTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'OutputTokens',
        expr: `sum(${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="output"})`,
        instant: true,
      },
    ],
  });

  const cacheReadTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CacheReadTokens',
        expr: `sum(${METRICS.TOKEN_USAGE}{${LABELS.USER_EMAIL}=~"$member", ${LABELS.MODEL}=~"$model", ${LABELS.TOKEN_TYPE}="cache_read"})`,
        instant: true,
      },
    ],
  });

  const tokensByTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensByType',
        expr: QUERIES.tokensByType,
        legendFormat: '{{type}}',
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

  const tokensByModelQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensByModel',
        expr: QUERIES.tokensByModel,
        legendFormat: '{{model}}',
        instant: true,
      },
    ],
  });

  const tokensByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensByMember',
        expr: QUERIES.tokensByMember,
        legendFormat: '{{user_email}}',
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
        // Row 1: Token stats by type
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Total Tokens')
                .setUnit('short')
                .setData(totalTokensQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Input Tokens')
                .setUnit('short')
                .setData(inputTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ fixedColor: 'blue', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Output Tokens')
                .setUnit('short')
                .setData(outputTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ fixedColor: 'green', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Cache Read')
                .setUnit('short')
                .setData(cacheReadTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ fixedColor: 'purple', mode: 'fixed' })
                .build(),
            }),
          ],
        }),
        // Row 2: Distribution and over time
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '35%',
              body: PanelBuilders.piechart()
                .setTitle('Token Distribution by Type')
                .setUnit('short')
                .setData(tokensByTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '65%',
              body: PanelBuilders.timeseries()
                .setTitle('Token Usage Over Time')
                .setUnit('short')
                .setData(tokensOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .setCustomFieldConfig('fillOpacity', 30)
                .build(),
            }),
          ],
        }),
        // Row 3: By model and by member
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.piechart()
                .setTitle('Tokens by Model')
                .setUnit('short')
                .setData(tokensByModelQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.piechart()
                .setTitle('Tokens by Team Member')
                .setUnit('short')
                .setData(tokensByMemberQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
