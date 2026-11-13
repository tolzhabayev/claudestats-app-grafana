import { PanelBuilders, SceneDataTransformer, SceneQueryRunner, SceneVariableSet } from '@grafana/scenes';
import { LABELS, PLUGIN_BASE_URL } from '../../constants';
import { Queries, UNATTRIBUTED } from '../queries';

// One column per query: [refId, column name, query key, unit, decimals].
const COLUMNS = [
  ['Cost', 'Cost', 'costByMember', 'currencyUSD', 2],
  ['Tokens', 'Tokens', 'tokensByMember', 'short', 1],
  ['Sessions', 'Sessions', 'sessionsByMember', 'none', 0],
  ['ActiveTime', 'Active Time', 'activeTimeByMember', 's', 0],
  ['LinesAdded', 'Added', 'linesAddedByMember', 'none', 0],
  ['LinesRemoved', 'Removed', 'linesRemovedByMember', 'none', 0],
  ['Commits', 'Commits', 'commitsByMember', 'none', 0],
  ['PullRequests', 'PRs', 'pullRequestsByMember', 'none', 0],
  ['AcceptanceRate', 'Accept %', 'toolAcceptanceRateByMember', 'percent', 0],
] as const satisfies ReadonlyArray<readonly [string, string, keyof Queries, string, number]>;

/**
 * One sortable row per team member with their cost, tokens, sessions, active
 * time, lines, commits, pull requests and edit acceptance rate. Each column is
 * its own instant query in table format, merged on the `member` label.
 * Clicking a member filters the app to them, keeping every other filter.
 * Usage with no identity isn't a member, so its Unattributed bucket is left
 * out here; the other by-member panels and the totals still include it.
 */
export function teamLeaderboard(queries: Queries, variables: SceneVariableSet) {
  // Every other variable keeps its current value(s); only the member changes.
  const keep = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => name !== 'member')
    .map((name) => `\${${name}:queryparam}`)
    .join('&');

  const runner = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: COLUMNS.map(([refId, , key]) => ({
      refId: `Leaderboard${refId}`,
      expr: queries[key],
      instant: true,
      format: 'table',
    })),
  });

  const data = new SceneDataTransformer({
    $data: runner,
    transformations: [
      { id: 'merge', options: {} },
      {
        id: 'filterByValue',
        options: {
          type: 'exclude',
          match: 'any',
          filters: [{ fieldName: LABELS.MEMBER, config: { id: 'equal', options: { value: UNATTRIBUTED } } }],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: { Time: true },
          indexByName: Object.fromEntries([
            [LABELS.MEMBER, 0],
            ...COLUMNS.map(([refId], i) => [`Value #Leaderboard${refId}`, i + 1]),
          ]),
          renameByName: Object.fromEntries([
            [LABELS.MEMBER, 'Team Member'],
            ...COLUMNS.map(([refId, name]) => [`Value #Leaderboard${refId}`, name]),
          ]),
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('Team Leaderboard')
    .setDescription(
      'One row per team member for the period. Added and Removed are lines of code, PRs are pull requests, and Accept % is the edit acceptance rate. Click a column header to sort, or a member to filter the app to them. Shows every member regardless of the Team Member filter; cost and tokens follow the Model filter.'
    )
    .setData(data)
    .setOption('sortBy', [{ displayName: 'Cost', desc: true }])
    .setOverrides((b) => {
      for (const [, name, , unit, decimals] of COLUMNS) {
        b.matchFieldsWithName(name)
          .overrideUnit(unit)
          .overrideDecimals(decimals)
          .overrideCustomFieldConfig('minWidth', 90);
      }
      b.matchFieldsWithName('Team Member')
        .overrideCustomFieldConfig('width', 240)
        .overrideLinks([
          {
            title: 'Filter to this member',
            url: `${PLUGIN_BASE_URL}?\${__url_time_range}&${keep}&var-member=\${__value.raw:percentencode}`,
          },
        ]);
    })
    .build();
  // The data too, so the row can size itself to the number of members.
  return { panel, data };
}
