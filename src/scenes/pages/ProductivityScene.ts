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
  GraphDrawStyle,
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  VizOrientation,
} from '@grafana/schema';
import { QUERIES } from '../queries';
import { PANEL_HEIGHTS } from '../../constants';

export function getProductivityScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet
): EmbeddedScene {
  const totalLinesOfCodeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalLinesOfCode',
        expr: QUERIES.totalLinesOfCode,
        instant: true,
      },
    ],
  });

  const totalCommitsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalCommits',
        expr: QUERIES.totalCommits,
        instant: true,
      },
    ],
  });

  const totalPullRequestsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalPullRequests',
        expr: QUERIES.totalPullRequests,
        instant: true,
      },
    ],
  });

  const totalActiveTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalActiveTime',
        expr: QUERIES.totalActiveTime,
        instant: true,
      },
    ],
  });

  const linesOfCodeByTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'LinesOfCodeByType',
        expr: QUERIES.linesOfCodeByType,
        legendFormat: '{{type}}',
        instant: true,
      },
    ],
  });

  const linesOfCodeOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'LinesOfCodeOverTime',
        expr: QUERIES.linesOfCodeOverTime,
        legendFormat: '{{type}}',
      },
    ],
  });

  const commitsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CommitsOverTime',
        expr: QUERIES.commitsOverTime,
      },
    ],
  });

  const pullRequestsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'PullRequestsOverTime',
        expr: QUERIES.pullRequestsOverTime,
      },
    ],
  });

  const activeTimeByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveTimeByMember',
        expr: QUERIES.activeTimeByMember,
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
        // Row 1: Stats
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Lines of Code')
                .setUnit('short')
                .setData(totalLinesOfCodeQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ fixedColor: 'blue', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Commits')
                .setUnit('short')
                .setData(totalCommitsQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ fixedColor: 'green', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Pull Requests')
                .setUnit('short')
                .setData(totalPullRequestsQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ fixedColor: 'purple', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Active Time')
                .setUnit('s')
                .setData(totalActiveTimeQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ fixedColor: 'orange', mode: 'fixed' })
                .build(),
            }),
          ],
        }),
        // Row 2: Lines of code charts
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '35%',
              body: PanelBuilders.piechart()
                .setTitle('Lines Added vs Removed')
                .setUnit('short')
                .setData(linesOfCodeByTypeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.Table, placement: 'right', values: ['value', 'percent'] as never })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '65%',
              body: PanelBuilders.timeseries()
                .setTitle('Lines of Code Over Time')
                .setUnit('short')
                .setData(linesOfCodeOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
                .setCustomFieldConfig('fillOpacity', 30)
                .build(),
            }),
          ],
        }),
        // Row 3: Commits and PRs over time
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.MEDIUM,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.timeseries()
                .setTitle('Commits Over Time')
                .setUnit('short')
                .setData(commitsOverTimeQuery)
                .setCustomFieldConfig('fillOpacity', 30)
                .setCustomFieldConfig('drawStyle', GraphDrawStyle.Bars)
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.timeseries()
                .setTitle('Pull Requests Over Time')
                .setUnit('short')
                .setData(pullRequestsOverTimeQuery)
                .setCustomFieldConfig('fillOpacity', 30)
                .setCustomFieldConfig('drawStyle', GraphDrawStyle.Bars)
                .build(),
            }),
          ],
        }),
        // Row 4: Active time by member
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: PanelBuilders.bargauge()
                .setTitle('Active Time by Team Member')
                .setUnit('s')
                .setData(activeTimeByMemberQuery)
                .setOption('orientation', VizOrientation.Horizontal)
                .setOption('displayMode', BarGaugeDisplayMode.Gradient)
                .setOption('valueMode', BarGaugeValueMode.Text)
                .setOption('showUnfilled', true)
                .setOption('minVizWidth', 200)
                .setOption('minVizHeight', 50)
                .setDisplayName('${__series.name}')
                .build(),
            }),
          ],
        }),
      ],
    }),
  });
}
