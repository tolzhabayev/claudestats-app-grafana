import {
  EmbeddedScene,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueControl,
  SceneObject,
} from '@grafana/scenes';
import { PANEL_HEIGHTS } from '../../constants';
import { buildLogQueries, LogQueries } from '../logQueries';
import { emptyHint, lokiBreakdown, lokiCountStat } from '../lokiPanels';
import { OptionalVariableControl } from '../OptionalVariableControl';
import { LOKI_DS_VARIABLE } from '../variables';

function row(height: number, ...bodies: SceneObject[]) {
  return new SceneFlexLayout({
    direction: 'row',
    height,
    children: bodies.map((body) => new SceneFlexItem({ body })),
  });
}

/**
 * Security: permission escalations, what checked tool calls, login failures,
 * plugin installs and managed settings, from the events Claude Code sends to
 * Loki. Useful without OTEL_LOG_TOOL_DETAILS; panels say what the flag adds.
 */
export function getSecurityScene(
  timeRange: SceneTimeRange,
  variables: SceneVariableSet,
  q: LogQueries = buildLogQueries()
): EmbeddedScene {
  const none = emptyHint(q.anyEvents);
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
        row(
          PANEL_HEIGHTS.STAT,
          lokiCountStat(
            'Escalations',
            q.escalations,
            'Permission Escalations',
            'Switches to bypassPermissions (every tool call allowed) or auto (a classifier decides) mode.'
          ),
          lokiCountStat('LoginFailures', q.loginFailures, 'Login Failures', 'Failed logins to Claude Code.'),
          lokiCountStat(
            'UnofficialPluginInstalls',
            q.unofficialPluginInstalls,
            'Unofficial Plugin Installs',
            'Plugins installed from a marketplace that is not an official Anthropic one. Plugin and marketplace names need OTEL_LOG_TOOL_DETAILS=1.'
          ),
          lokiCountStat(
            'RefusedSessions',
            q.refusedSessions,
            'Sessions Refused by Policy',
            'Sessions a managed settings policy stopped from starting, for example because the policy helper failed.'
          )
        ),
        row(
          PANEL_HEIGHTS.LARGE,
          lokiBreakdown(
            'EscalationsByMember',
            q.escalationsByMember,
            'member',
            'Escalations by Team Member',
            'Who switched to bypassPermissions or auto mode.',
            'none',
            none('Nobody switched to bypassPermissions or auto mode in this period.')
          ),
          lokiBreakdown(
            'ModeChanges',
            q.modeChanges,
            'change',
            'Permission Mode Changes',
            'Every permission mode change, as previous mode → new mode.',
            'none',
            none('No permission mode changes in this period.')
          )
        ),
        row(
          PANEL_HEIGHTS.LARGE,
          lokiBreakdown(
            'DecisionsByMode',
            q.decisionsByMode,
            'permission_mode',
            'Tool Decisions by Mode',
            'Tool call permission checks by the permission mode they ran in. Needs Claude Code v2.1.301 or later.',
            'none',
            none('No tool decisions with a permission mode in this period. Needs Claude Code v2.1.301 or later.')
          ),
          lokiBreakdown(
            'ClassifierVerdicts',
            q.classifierVerdicts,
            'classifier_verdict',
            'Auto Mode Classifier Verdicts',
            'What the auto mode classifier decided: allow, block, no_verdict (no usable answer, so denied) or unavailable (the check failed, so denied).',
            'none',
            none('The auto mode classifier made no decisions in this period.')
          ),
          lokiBreakdown(
            'ClassifierBlocks',
            q.classifierBlocks,
            'classifier_category',
            'Classifier Blocks by Rule',
            'Calls the classifier blocked, by the built-in rule it named, such as data_exfiltration. The rule is sent only with OTEL_LOG_TOOL_DETAILS=1.',
            'none',
            none('The classifier blocked no tool calls in this period.')
          ),
          lokiBreakdown(
            'RejectionsBySource',
            q.rejectionsBySource,
            'source',
            'Rejected Tool Calls by Source',
            'Rejected tool calls by who rejected them: a config rule, policy, mode or the classifier (Config rule), a hook, or the user.',
            'none',
            none('No tool calls were rejected in this period.')
          )
        ),
        row(
          PANEL_HEIGHTS.LARGE,
          lokiBreakdown(
            'AuthFailuresByCategory',
            q.authFailuresByCategory,
            'error_category',
            'Login Failures by Category',
            'Failed logins by error category. Logouts are not counted, and the raw error message is never sent.',
            'none',
            none('No failed logins in this period.')
          ),
          lokiBreakdown(
            'PluginInstallsByMarketplace',
            q.pluginInstallsByMarketplace,
            'marketplace',
            'Plugin Installs by Marketplace',
            'Plugin installs from official Anthropic marketplaces and from others.',
            'none',
            none('No plugins were installed in this period.')
          ),
          lokiBreakdown(
            'ManagedSettingsHelperState',
            q.managedSettingsHelperState,
            'managed_settings_helper_state',
            'Managed Settings Helper State',
            'The state of the managed settings policy helper, reported at session start and when it changes. Shows whether machines run the expected managed settings.',
            'none',
            none('No managed settings reports in this period.')
          )
        ),
      ],
    }),
  });
}
