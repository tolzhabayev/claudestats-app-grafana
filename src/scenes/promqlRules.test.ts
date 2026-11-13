import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getMetrics } from '../constants';
import { getFilterDimensions, TEAM_DIMENSION } from './dimensions';
import { buildQueries, memberValuesQuery } from './queries';
import { getDimensionVariable } from './variables';

/**
 * Writes every PromQL query the app sends as a recording rule, so CI can check
 * the syntax with `promtool check rules` against a real Prometheus parser.
 * Grafana's macros are replaced with values Prometheus accepts first.
 */
const MACROS: Array<[RegExp, string]> = [
  [/\$__rate_interval/g, '1m'],
  [/\$__interval_ms/g, '60000'],
  [/\$__interval/g, '1m'],
  [/\$__range/g, '1h'],
];

/** Grafana's `query_result(...)` wraps a plain PromQL query for variables. */
const unwrapQueryResult = (expr: string) => expr.replace(/^query_result\((.*)\)$/, '$1');

function allQueries(): Array<[string, string]> {
  const dimensions = getFilterDimensions(['team.id']);
  const queries: Array<[string, string]> = [];
  for (const format of ['prometheus', 'otlp'] as const) {
    const m = getMetrics(format);
    for (const [key, expr] of Object.entries(buildQueries(m, dimensions))) {
      queries.push([`${format}_${key}`, expr]);
    }
    queries.push([`${format}_memberValues`, unwrapQueryResult(memberValuesQuery(m))]);
  }
  const teamQuery = getDimensionVariable(TEAM_DIMENSION).state.query;
  const team = typeof teamQuery === 'string' ? teamQuery : String((teamQuery as { query?: unknown }).query);
  queries.push(['teamValues', unwrapQueryResult(team)]);
  return queries;
}

it('writes every PromQL query as a recording rule for promtool', () => {
  const rules = allQueries().map(([key, expr]) => ({
    record: `claudestats:${key}`,
    expr: MACROS.reduce((e, [macro, value]) => e.replace(macro, value), expr),
  }));
  expect(rules.length).toBeGreaterThan(100);
  for (const { record, expr } of rules) {
    expect({ record, macros: expr.match(/\$__\w+/g) }).toEqual({ record, macros: null });
  }
  // JSON is valid YAML.
  const file = process.env.PROMQL_RULES_FILE ?? join(tmpdir(), 'claudestats-promql-rules.yaml');
  writeFileSync(file, JSON.stringify({ groups: [{ name: 'claudestats', rules }] }, null, 2));
});
