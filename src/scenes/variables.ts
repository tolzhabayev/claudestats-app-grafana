import {
  QueryVariable,
  DataSourceVariable,
  SceneVariableSet,
} from '@grafana/scenes';
import { METRICS, LABELS, MetricNames } from '../constants';

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
 * Creates a team member filter variable using user_email
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
      query: `label_values(${metrics.COST_USAGE}, ${LABELS.USER_EMAIL})`,
      refId: 'MemberQuery',
    },
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
    variables: [
      getPrometheusDataSourceVariable(),
      getTeamMemberVariable(metrics),
      getModelVariable(metrics),
    ],
  });
}
