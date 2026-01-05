import {
  QueryVariable,
  DataSourceVariable,
  SceneVariableSet,
} from '@grafana/scenes';
import { METRICS, LABELS } from '../constants';

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
export function getTeamMemberVariable() {
  return new QueryVariable({
    name: 'member',
    label: 'Team Member',
    datasource: {
      type: 'prometheus',
      uid: '${prometheus_ds}',
    },
    query: {
      query: `label_values(${METRICS.COST_USAGE}, ${LABELS.USER_EMAIL})`,
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
export function getModelVariable() {
  return new QueryVariable({
    name: 'model',
    label: 'Model',
    datasource: {
      type: 'prometheus',
      uid: '${prometheus_ds}',
    },
    query: {
      query: `label_values(${METRICS.COST_USAGE}, ${LABELS.MODEL})`,
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
export function getSharedVariables() {
  return new SceneVariableSet({
    variables: [
      getPrometheusDataSourceVariable(),
      getTeamMemberVariable(),
      getModelVariable(),
    ],
  });
}
