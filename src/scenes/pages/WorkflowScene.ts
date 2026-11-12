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
  VizPanel,
} from '@grafana/scenes';
import { LegendDisplayMode } from '@grafana/schema';
import { PANEL_HEIGHTS } from '../../constants';
import { buildLogQueries, LogQueries } from '../logQueries';
import { LOKI, lokiBreakdown, lokiCountStat, lokiTable, NO_EVENTS } from '../lokiPanels';
import { OptionalVariableControl } from '../OptionalVariableControl';
import { LOKI_DS_VARIABLE } from '../variables';

function row(height: number, ...bodies: VizPanel[]) {
  return new SceneFlexLayout({
    direction: 'row',
    height,
    children: bodies.map((body) => new SceneFlexItem({ body })),
  });
}

/** Cache write tokens split by cache lifetime (5 minutes vs 1 hour). */
function cacheLifetimePanel(queries: LogQueries) {
  return PanelBuilders.piechart()
    .setTitle('Cache Writes by Lifetime')
    .setDescription(
      'Prompt cache write tokens by how long the cache entry lives: 5 minutes or 1 hour. 1-hour writes cost more. Needs Claude Code v2.1.300 or later.'
    )
    .setUnit('short')
    .setData(
      new SceneQueryRunner({
        datasource: LOKI,
        queries: [
          { refId: 'CacheWrites5m', expr: queries.cacheWrites5m, queryType: 'instant' },
          { refId: 'CacheWrites1h', expr: queries.cacheWrites1h, queryType: 'instant' },
        ],
      })
    )
    .setOption('pieType', 'donut' as never)
    .setOption('legend', {
      displayMode: LegendDisplayMode.Table,
      placement: 'right',
      values: ['value', 'percent'] as never,
    })
    .setNoValue(NO_EVENTS)
    .setOverrides((b) => {
      b.matchFieldsByQuery('CacheWrites5m').overrideDisplayName('5 minutes');
      b.matchFieldsByQuery('CacheWrites1h').overrideDisplayName('1 hour');
    })
    .build();
}

/**
 * Workflow: how Claude Code works for the team, from the events it sends to
 * Loki: model request latency, subagents, context compaction, skills, MCP
 * server connections and hooks.
 */
export function getWorkflowScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  q: LogQueries = buildLogQueries()
): EmbeddedScene {
  const dimensionNames = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => !['prometheus_ds', LOKI_DS_VARIABLE, 'member', 'model'].includes(name));

  return new EmbeddedScene({
    $timeRange: timeRange,
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
        // Model request latency (api_request)
        row(
          PANEL_HEIGHTS.LARGE,
          lokiTable(
            'Request Latency by Model',
            'API requests per model with their median (p50) and 95th percentile (p95) duration. Time to first token is not in these events.',
            'model',
            'Model',
            [
              { refId: 'RequestsByModel', name: 'Requests', expr: q.requestsByModel, unit: 'none', decimals: 0 },
              { refId: 'RequestLatencyP50', name: 'p50', expr: q.requestLatencyP50, unit: 'ms', decimals: 1 },
              { refId: 'RequestLatencyP95', name: 'p95', expr: q.requestLatencyP95, unit: 'ms', decimals: 1 },
            ]
          ),
          lokiBreakdown(
            'RequestLatencyByEffort',
            q.requestLatencyP95ByEffort,
            'effort',
            'p95 Latency by Effort',
            '95th percentile API request duration by effort level. Requests sent without an effort level show as default.',
            'ms'
          ),
          cacheLifetimePanel(q)
        ),
        // Subagents (subagent_completed)
        row(
          PANEL_HEIGHTS.LARGE,
          lokiTable(
            'Subagents',
            'One row per subagent type: runs, 95th percentile run time, average tool calls per run, the share that ran in the background, and the share served by more than one model after a mid-run fallback. User-defined agents show as custom unless OTEL_LOG_TOOL_DETAILS=1.',
            'agent_type',
            'Subagent',
            [
              { refId: 'SubagentRuns', name: 'Runs', expr: q.subagentRuns, unit: 'none', decimals: 0 },
              {
                refId: 'SubagentDurationP95',
                name: 'p95 Run Time',
                expr: q.subagentDurationP95,
                unit: 'ms',
                decimals: 1,
              },
              {
                refId: 'SubagentToolUses',
                name: 'Tool Calls per Run',
                expr: q.subagentToolUses,
                unit: 'none',
                decimals: 1,
              },
              {
                refId: 'SubagentAsyncShare',
                name: 'Background',
                expr: q.subagentAsyncShare,
                unit: 'percent',
                decimals: 0,
              },
              {
                refId: 'SubagentModelSwapShare',
                name: 'Model Switched',
                expr: q.subagentModelSwapShare,
                unit: 'percent',
                decimals: 0,
              },
            ]
          )
        ),
        // Context compaction (compaction)
        row(
          PANEL_HEIGHTS.STAT,
          lokiCountStat(
            'Compactions',
            q.compactions,
            'Compactions',
            'Conversation compactions that completed in the period.'
          ),
          lokiCountStat(
            'CompactionAutoShare',
            q.compactionAutoShare,
            'Auto Compactions',
            'The share of compactions Claude Code triggered on its own when the context filled up, rather than /compact. A high share points to long sessions.',
            'percent'
          ),
          lokiCountStat(
            'CompactionFailureRate',
            q.compactionFailureRate,
            'Failed Compactions',
            'The share of compactions that failed.',
            'percent'
          ),
          lokiCountStat(
            'CompactionTokensReclaimed',
            q.compactionTokensReclaimed,
            'Tokens Freed per Compaction',
            'The average number of context tokens a compaction freed: tokens before minus tokens after.',
            'short',
            1
          )
        ),
        // Skills and MCP servers
        row(
          PANEL_HEIGHTS.LARGE,
          lokiBreakdown(
            'SkillActivations',
            q.skillActivations,
            'skill_name',
            'Skill Activations',
            'Skill activations per skill. User-defined and third-party plugin skills show as custom_skill unless OTEL_LOG_TOOL_DETAILS=1.'
          ),
          lokiBreakdown(
            'SkillTriggers',
            q.skillTriggers,
            'invocation_trigger',
            'Skills by Trigger',
            'How skills were started: user-slash (a person ran it as a command), claude-proactive (Claude picked it up on its own) or nested-skill (another skill started it).'
          ),
          lokiBreakdown(
            'McpConnections',
            q.mcpConnections,
            'status',
            'MCP Server Connections',
            'MCP server connection events by status: connected, failed or disconnected.'
          ),
          lokiBreakdown(
            'McpFailures',
            q.mcpFailures,
            'error_code',
            'MCP Connection Failures',
            'Failed MCP server connections by error code. Server names need OTEL_LOG_TOOL_DETAILS=1 and are not shown here.'
          )
        ),
        // Hooks (hook_execution_complete)
        row(
          PANEL_HEIGHTS.LARGE,
          lokiTable(
            'Hooks',
            'One row per hook event, such as PreToolUse: how often its hooks ran, the 95th percentile time spent in them, how many returned a blocking decision and how many failed without blocking. Slow hooks add directly to the time a team member waits.',
            'hook_event',
            'Hook Event',
            [
              { refId: 'HookRuns', name: 'Runs', expr: q.hookRuns, unit: 'none', decimals: 0 },
              { refId: 'HookDurationP95', name: 'p95 Time', expr: q.hookDurationP95, unit: 'ms', decimals: 1 },
              { refId: 'HookBlocking', name: 'Blocking', expr: q.hookBlocking, unit: 'none', decimals: 0 },
              { refId: 'HookErrors', name: 'Errors', expr: q.hookErrors, unit: 'none', decimals: 0 },
            ]
          )
        ),
      ],
    }),
  });
}
