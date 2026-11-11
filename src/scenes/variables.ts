import { VariableRefresh } from '@grafana/schema';
import { QueryVariable, DataSourceVariable, SceneVariableSet, VariableValueControl } from '@grafana/scenes';
import { METRICS, LABELS, MetricNames } from '../constants';
import { memberValuesQuery } from './queries';

/**
 * Creates a data source variable for Prometheus/Mimir
 */
export function getPrometheusDataSourceVariable() {
  return new DataSourceVariable({
    name: 'prometheus_ds',
    label: 'Metrics',
    pluginId: 'prometheus',
    includeAll: false,
  });
}

/**
 * Creates the team member filter variable. Members are identified by
 * `user_email`, else `enduser_id`, else the anonymous `user_id`, so API-key and
 * cloud-provider users can be picked too (see `scoped` in queries.ts).
 */
export function getTeamMemberVariable(metrics: MetricNames = METRICS) {
  return new QueryVariable({
    name: 'member',
    label: 'Team Member',
    datasource: {
      type: 'prometheus',
      uid: '${prometheus_ds}',
    },
    query: {
      query: memberValuesQuery(metrics),
      refId: 'MemberQuery',
    },
    regex: `/${LABELS.MEMBER}="([^"]+)"/`,
    sort: 1,
    refresh: VariableRefresh.onTimeRangeChanged,
    includeAll: true,
    defaultToAll: true,
    allValue: '.*',
  });
}

/**
 * Creates a model filter variable (sonnet, opus, etc.)
 */
export function getModelVariable(metrics: MetricNames = METRICS) {
  return new QueryVariable({
    name: 'model',
    label: 'Model',
    datasource: {
      type: 'prometheus',
      uid: '${prometheus_ds}',
    },
    query: {
      query: `label_values(${metrics.COST_USAGE}, ${LABELS.MODEL})`,
      refId: 'ModelQuery',
    },
    includeAll: true,
    defaultToAll: true,
    allValue: '.*',
  });
}

/**
 * Creates the shared variable set used across all scenes
 */
export function getSharedVariables(metrics: MetricNames = METRICS) {
  return new SceneVariableSet({
    variables: [getPrometheusDataSourceVariable(), getTeamMemberVariable(metrics), getModelVariable(metrics)],
  });
}

/**
 * Variable controls without the Model picker, for pages whose metrics carry no
 * `model` label (commits, pull requests, active time, tool decisions). Showing
 * the picker there suggested a filter that silently did nothing.
 */
export function getControlsWithoutModel() {
  return [
    new VariableValueControl({ variableName: 'prometheus_ds' }),
    new VariableValueControl({ variableName: 'member' }),
  ];
}
