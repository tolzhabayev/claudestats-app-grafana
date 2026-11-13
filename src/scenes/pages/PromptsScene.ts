import {
  EmbeddedScene,
  PanelBuilders,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueControl,
} from '@grafana/scenes';
import { BarGaugeDisplayMode, BarGaugeValueMode, LegendDisplayMode, VizOrientation } from '@grafana/schema';
import { PANEL_HEIGHTS } from '../../constants';
import { buildLogQueries, LogQueries, PROMPT_LENGTH_BUCKETS } from '../logQueries';
import { emptyHints, LOKI, lokiBreakdown, lokiCountStat, lokiRunner, NO_EVENTS } from '../lokiPanels';
import { BAR_GAUGE_COLOR, BAR_GAUGE_TEXT, overTimeBars } from '../panelStyle';
import { OptionalVariableControl } from '../OptionalVariableControl';
import { LOKI_DS_VARIABLE } from '../variables';

/** Typed prompts per length bucket, one query per bucket so the bars keep their order. */
function promptLengthPanel(queries: LogQueries) {
  const refId = (i: number) => `PromptLength${i}`;
  return PanelBuilders.bargauge()
    .setTitle('Prompt Length')
    .setDescription(
      'Typed prompts by length in characters. Slash commands are left out. The prompt text itself is not needed and stays redacted.'
    )
    .setUnit('none')
    .setDecimals(0)
    .setMin(0)
    .setData(
      new SceneQueryRunner({
        datasource: LOKI,
        queries: queries.promptLengthBuckets.map((expr, i) => ({ refId: refId(i), expr, queryType: 'instant' })),
      })
    )
    .setOption('displayMode', BarGaugeDisplayMode.Gradient)
    .setColor(BAR_GAUGE_COLOR)
    .setOption('orientation', VizOrientation.Horizontal)
    .setOption('text', BAR_GAUGE_TEXT)
    .setOption('valueMode', BarGaugeValueMode.Text)
    .setOption('showUnfilled', true)
    .setOption('minVizWidth', 150)
    .setOption('minVizHeight', 25)
    .setNoValue(NO_EVENTS)
    .setOverrides((b) => {
      PROMPT_LENGTH_BUCKETS.forEach((bucket, i) => b.matchFieldsByQuery(refId(i)).overrideDisplayName(bucket.name));
    })
    .build();
}

/**
 * Prompts: how the team prompts Claude Code, from `user_prompt` events in Loki.
 * Only counts, lengths and slash command names are used; prompt text stays
 * redacted unless OTEL_LOG_USER_PROMPTS=1, and the tab doesn't need it.
 */
export function getPromptsScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: LogQueries = buildLogQueries()
): EmbeddedScene {
  const none = emptyHints(queries.anyEvents);
  const dimensionNames = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => !['prometheus_ds', LOKI_DS_VARIABLE, 'member', 'model'].includes(name));

  return new EmbeddedScene({
    $timeRange: timeRange,
    // The one event check every empty Loki panel on this tab waits for.
    $behaviors: [none.check],
    $variables: variables,
    controls: [
      new VariableValueControl({ variableName: LOKI_DS_VARIABLE }),
      new VariableValueControl({ variableName: 'member' }),
      ...dimensionNames.map((variableName) => new OptionalVariableControl({ variableName })),
      new SceneControlsSpacer(),
      new SceneTimePicker({ isOnCanvas: true }),
      new SceneRefreshPicker({ intervals: ['30s', '1m', '5m', '15m', '30m'] }),
    ],
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        // Row 1: Totals
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.STAT,
          children: [
            new SceneFlexItem({
              body: lokiCountStat(
                'Prompts',
                queries.prompts,
                'Prompts',
                'Prompts sent to Claude Code in the period, typed prompts and slash commands together.'
              ),
            }),
            new SceneFlexItem({
              body: lokiCountStat(
                'CommandShare',
                queries.commandShare,
                'Slash Command Share',
                'The share of prompts that invoked a slash command, such as /compact.',
                'percent'
              ),
            }),
            new SceneFlexItem({
              body: lokiCountStat(
                'PromptsPerSession',
                queries.promptsPerSession,
                'Prompts per Session',
                'The average number of prompts in a session that had at least one prompt in the period.',
                'none',
                1
              ),
            }),
            new SceneFlexItem({
              body: lokiCountStat(
                'PromptLengthP50',
                queries.promptLengthP50,
                'Median Prompt Length',
                'The median length of typed prompts, in characters. Slash commands are left out.',
                'suffix: chars'
              ),
            }),
          ],
        }),
        // Row 2: Prompts over time
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: overTimeBars()
                .setTitle('Prompts Over Time')
                .setDescription('Prompts per interval, stacked as typed prompts and slash commands.')
                .setUnit('none')
                .setData(lokiRunner('PromptsOverTime', queries.promptsOverTime, { legendFormat: '{{kind}}' }))
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
                .build(),
            }),
          ],
        }),
        // Row 3: Commands and prompt length
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              body: lokiBreakdown(
                'TopCommands',
                queries.topCommands,
                'command_name',
                'Top Slash Commands',
                'The most-used slash commands. Built-in commands show their name; custom, plugin and MCP commands show as custom or mcp unless team members set OTEL_LOG_TOOL_DETAILS=1.',
                'none',
                none('No slash commands in this period.')
              ),
            }),
            new SceneFlexItem({
              body: lokiBreakdown(
                'CommandsBySource',
                queries.commandsBySource,
                'command_source',
                'Slash Commands by Source',
                'Where the slash commands come from: builtin, custom (including plugins) or mcp.',
                'none',
                none('No slash commands in this period.')
              ),
            }),
            new SceneFlexItem({ body: promptLengthPanel(queries) }),
          ],
        }),
      ],
    }),
  });
}
