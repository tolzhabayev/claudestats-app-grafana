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
import { QUERIES, Queries } from '../queries';
import { attributionBarGauge, OVER_TIME_MIN_STEP, OVER_TIME_QUERY_OPTIONS, overTimeBars } from '../panelStyle';
import { PANEL_HEIGHTS } from '../../constants';

// Repository attributes are off by default, so an empty panel usually means they aren't sent.
const REPOSITORY_HINT = 'No data. Needs OTEL_METRICS_INCLUDE_REPOSITORY=true';

export function getTokensScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  queries: Queries = QUERIES
): EmbeddedScene {
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

  const inputTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'InputTokens',
        expr: queries.inputTokens,
        instant: true,
      },
    ],
  });

  const outputTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'OutputTokens',
        expr: queries.outputTokens,
        instant: true,
      },
    ],
  });

  const cacheReadTokensQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'CacheReadTokens',
        expr: queries.cacheReadTokens,
        instant: true,
      },
    ],
  });

  const tokensByTypeQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensByType',
        expr: queries.tokensByType,
        legendFormat: '{{type}}',
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

  const tokensByModelQuery = new SceneQueryRunner({
    datasource: { type: 'prometheus', uid: '${prometheus_ds}' },
    queries: [
      {
        refId: 'TokensByModel',
        expr: queries.tokensByModel,
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
        expr: queries.tokensByMember,
        legendFormat: '{{member}}',
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
                .setDescription('All tokens in the period: input, output, cache reads and cache writes.')
                .setUnit('short')
                .setData(totalTokensQuery)
                .setOption('graphMode', BigValueGraphMode.Area)
                .setColor({ mode: 'fixed', fixedColor: 'text' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Input Tokens')
                .setDescription('Input tokens, not counting tokens read from or written to the prompt cache.')
                .setUnit('short')
                .setData(inputTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ fixedColor: 'blue', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Output Tokens')
                .setDescription('Tokens the model generated.')
                .setUnit('short')
                .setData(outputTokensQuery)
                .setOption('graphMode', BigValueGraphMode.None)
                .setColor({ fixedColor: 'green', mode: 'fixed' })
                .build(),
            }),
            new SceneFlexItem({
              body: PanelBuilders.stat()
                .setTitle('Cache Read')
                .setDescription(
                  'Tokens read from the prompt cache. A high share is normal, because Claude Code reuses the cache across turns.'
                )
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
                .setDescription("Each token type's share: input, output, cacheRead and cacheCreation.")
                .setUnit('short')
                .setData(tokensByTypeQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .setOption('pieType', 'donut' as never)
                .build(),
            }),
            new SceneFlexItem({
              width: '65%',
              body: overTimeBars()
                .setTitle('Token Usage Over Time')
                .setDescription('Tokens per interval, stacked by token type. Each bar is an estimate for one interval.')
                .setUnit('short')
                .setData(tokensOverTimeQuery)
                .setOption('legend', { displayMode: LegendDisplayMode.List, placement: 'bottom' })
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
                .setDescription("Each model's share of tokens. Shows every model regardless of the Model filter.")
                .setUnit('short')
                .setData(tokensByModelQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .build(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: PanelBuilders.piechart()
                .setTitle('Tokens by Team Member')
                .setDescription(
                  "Each member's share of tokens. Shows every member regardless of the Team Member filter."
                )
                .setUnit('short')
                .setData(tokensByMemberQuery)
                .setOption('legend', {
                  displayMode: LegendDisplayMode.Table,
                  placement: 'right',
                  values: ['value', 'percent'] as never,
                })
                .build(),
            }),
          ],
        }),
        // Row 4: Token attribution by query source and subagent
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByQuerySource',
                queries.tokensByQuerySource,
                'query_source',
                'Tokens by Query Source',
                'short',
                { description: 'Tokens by what issued the request: main conversation, subagent or auxiliary.' }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByAgent',
                queries.tokensByAgent,
                'agent_name',
                'Tokens by Subagent',
                'short',
                {
                  noValue: 'No subagent ran in this period',
                  description:
                    'Tokens by the subagent type that issued the request. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 5: Token attribution by skill and MCP server
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensBySkill',
                queries.tokensBySkill,
                'skill_name',
                'Tokens by Skill',
                'short',
                {
                  noValue: 'No skill was active in this period',
                  description:
                    'Tokens by the skill that was active. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByMcpServer',
                queries.tokensByMcpServer,
                'mcp_server_name',
                'Tokens by MCP Server',
                'short',
                {
                  noValue: 'No MCP tool result was used in this period',
                  description:
                    'Tokens by the MCP server whose tool result the request used. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 6: Token attribution by plugin and MCP tool
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByPlugin',
                queries.tokensByPlugin,
                'plugin_name',
                'Tokens by Plugin',
                'short',
                {
                  noValue: 'No plugin skill or subagent ran in this period',
                  description:
                    'Tokens by the plugin that owns the active skill or subagent. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByMcpTool',
                queries.tokensByMcpTool,
                'mcp_tool_name',
                'Tokens by MCP Tool',
                'short',
                {
                  noValue: 'No MCP tool result was used in this period',
                  legendFormat: '{{mcp_tool_name}} · {{mcp_server_name}}',
                  description:
                    'Tokens by MCP tool, shown as tool · server, for requests that used an MCP tool result. User-defined and third-party names show as custom or third-party unless team members set OTEL_LOG_TOOL_DETAILS=1. Empty when nothing used one.',
                }
              ),
            }),
          ],
        }),
        // Row 7: Token attribution by speed (fast mode) and effort
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensBySpeed',
                queries.tokensBySpeed,
                'speed',
                'Tokens by Speed (Fast Mode)',
                'short',
                { description: 'Tokens by request speed: fast for fast mode, normal otherwise.' }
              ),
            }),
            new SceneFlexItem({
              width: '50%',
              body: attributionBarGauge(
                'TokensByEffort',
                queries.tokensByEffort,
                'effort',
                'Tokens by Effort',
                'short',
                { description: 'Tokens by effort level, or default when the model does not use one.' }
              ),
            }),
          ],
        }),
        // Row 8: Token attribution by repository
        new SceneFlexLayout({
          direction: 'row',
          height: PANEL_HEIGHTS.LARGE,
          children: [
            new SceneFlexItem({
              width: '100%',
              body: attributionBarGauge(
                'TokensByRepository',
                queries.tokensByRepository,
                'vcs_repository_name',
                'Tokens by Repository',
                'short',
                {
                  noValue: REPOSITORY_HINT,
                  description:
                    'Tokens by the Git repository Claude Code was working in. Needs OTEL_METRICS_INCLUDE_REPOSITORY=true.',
                }
              ),
            }),
          ],
        }),
      ],
    }),
  });
}
