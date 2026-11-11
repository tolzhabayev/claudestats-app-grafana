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
  GraphDrawStyle,
  BarGaugeDisplayMode,
  BarGaugeValueMode,
  VizOrientation,
} from '@grafana/schema';
import { ACTIVE_TIME_TYPE_NAMES, QUERIES, Queries } from '../queries';
import { getControlsWithoutModel } from '../variables';
import { PANEL_HEIGHTS } from '../../constants';

export function getProductivityScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES
): EmbeddedScene {
  const totalLinesOfCodeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalLinesOfCode',
        expr: queries.totalLinesOfCode,
        instant: true,
      },
    ],
  });

  const totalCommitsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalCommits',
        expr: queries.totalCommits,
        instant: true,
      },
    ],
  });

  const totalPullRequestsQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalPullRequests',
        expr: queries.totalPullRequests,
        instant: true,
      },
    ],
  });

  const totalActiveTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TotalActiveTime',
        expr: queries.totalActiveTime,
        instant: true,
      },
    ],
  });

  const linesOfCodeByTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'LinesOfCodeByType',
        expr: queries.linesOfCodeByType,
        legendFormat: '{{type}}',
        instant: true,
      },
    ],
  });

  const linesOfCodeByModelQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'LinesOfCodeByModel',
        expr: queries.linesOfCodeByModel,
        legendFormat: '{{model}}',
        instant: true,
      },
    ],
  });

  const linesOfCodeOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'LinesOfCodeOverTime',
        expr: queries.linesOfCodeOverTime,
        legendFormat: '{{type}}',
      },
    ],
  });

  const commitsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CommitsOverTime',
        expr: queries.commitsOverTime,
        legendFormat: 'Commits',
      },
    ],
  });

  const pullRequestsOverTimeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'PullRequestsOverTime',
        expr: queries.pullRequestsOverTime,
        legendFormat: 'Pull requests',
      },
    ],
  });

  const activeTimeByTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveTimeByType',
        expr: queries.activeTimeByType,
        legendFormat: '{{type}}',
        instant: true,
      },
    ],
  });

  const activeTimeByMemberQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'ActiveTimeByMember',
        expr: queries.activeTimeByMember,
        legendFormat: '{{member}}',
        instant: true,
      },
    ],
  });

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: variables,
    controls: [
      ...getControlsWithoutModel(variables),
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
              width: '30%',
              body: PanelBuilders.piechart()
                .setTitle('Lines Added vs Removed')
                .setUnit('short')
                .setData(linesOfCodeByTypeQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '35%',
              body: PanelBuilders.piechart()
                .setTitle('Lines of Code by Model')
                .setDescription(
                  'Lines added plus removed, by the model that wrote them. Lines from Claude Code versions before 2.1.172 have no model and show as unknown.'
                )
                .setUnit('short')
                .setData(linesOfCodeByModelQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .build(),
            }),
            new SceneFlexItem({
              width: '35%',
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
        // Row 4: Active time split (user vs CLI) and by member
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '35%',
              body: PanelBuilders.piechart()
                .setTitle('Active Time: User vs CLI')
                .setDescription(
                  'User is time spent interacting (typing). CLI is time Claude Code spends running tools and generating responses.'
                )
                .setUnit('s')
                .setData(activeTimeByTypeQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .setOption('pieType', 'donut' as never)
                .setOverrides((b) => {
                  for (const [type, name] of Object.entries(ACTIVE_TIME_TYPE_NAMES)) {
                    b.matchFieldsWithName(type).overrideDisplayName(name);
                  }
                })
                .build(),
            }),
            new SceneFlexItem({
              width: '65%',
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
