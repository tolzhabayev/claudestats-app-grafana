import { VariableHide, VariableRefresh } from '@grafana/schema';
import { QueryVariable, DataSourceVariable, SceneVariableSet, VariableValueControl } from '@grafana/scenes';
import { getMetrics, LABELS, MetricNames } from '../constants';
import { memberValuesQuery } from './queries';
import { FilterDimension, getFilterDimensions } from './dimensions';
import { OptionalVariableControl } from './OptionalVariableControl';

/** Matches the name of every Claude Code metric, Prometheus or OTLP format. */
const CLAUDE_CODE_METRICS = 'claude_code_.+';

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
export function getTeamMemberVariable(metrics: MetricNames = getMetrics()) {
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
    // Grafana renders each result as `{member="<value>"} <value> <ts>` without escaping the
    // value, and `member` is the only label, so match greedily up to the closing `"}` to keep
    // identities that contain quotes or braces intact.
    regex: `/${LABELS.MEMBER}="(.+)"}/`,
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
export function getModelVariable(metrics: MetricNames = getMetrics()) {
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
 * Creates the picker for a filter dimension (Repository or a configured label).
 * A dimension with `hideWhenEmpty` stays hidden until its label has values, so
 * teams that don't send repository attributes don't see an empty picker.
 */
export function getDimensionVariable(dimension: FilterDimension) {
  const variable = new QueryVariable({
    name: dimension.variable,
    label: dimension.title,
    datasource: {
      type: 'prometheus',
      uid: '${prometheus_ds}',
    },
    query: {
      // Every Claude Code metric in either naming format, not just cost: the filter applies to
      // sessions, tools and productivity too. Other apps' metrics with the same label stay out.
      query: `label_values({__name__=~"${CLAUDE_CODE_METRICS}"}, ${dimension.label})`,
      refId: `${dimension.variable}Query`,
    },
    sort: 1,
    refresh: VariableRefresh.onTimeRangeChanged,
    includeAll: true,
    defaultToAll: true,
    allValue: '.*',
    hide: dimension.hideWhenEmpty ? VariableHide.hideVariable : VariableHide.dontHide,
  });

  if (dimension.hideWhenEmpty) {
    variable.subscribeToState((state) => {
      const hide = state.options.length > 0 ? VariableHide.dontHide : VariableHide.hideVariable;
      if (state.hide !== hide) {
        variable.setState({ hide });
      }
    });
  }

  return variable;
}

/**
 * Creates the shared variable set used across all scenes
 */
export function getSharedVariables(
  metrics: MetricNames = getMetrics(),
  dimensions: FilterDimension[] = getFilterDimensions()
) {
  return new SceneVariableSet({
    variables: [
      getPrometheusDataSourceVariable(),
      getTeamMemberVariable(metrics),
      getModelVariable(metrics),
      ...dimensions.map(getDimensionVariable),
    ],
  });
}

/**
 * Variable controls without the Model picker, for pages whose metrics carry no
 * `model` label (commits, pull requests, active time, tool decisions). Showing
 * the picker there suggested a filter that silently did nothing. The filter
 * dimension pickers follow, hidden while their variable is hidden.
 */
export function getControlsWithoutModel(variables: SceneVariableSet) {
  const dimensionNames = variables.state.variables
    .map((v) => v.state.name)
    .filter((name) => !['prometheus_ds', 'member', 'model'].includes(name));
  return [
    new VariableValueControl({ variableName: 'prometheus_ds' }),
    new VariableValueControl({ variableName: 'member' }),
    ...dimensionNames.map((variableName) => new OptionalVariableControl({ variableName })),
  ];
}
