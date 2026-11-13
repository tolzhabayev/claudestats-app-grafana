import { getMetrics } from '../constants';
import { getFilterDimensions } from './dimensions';
import { buildQueries, changeVsPrevious, memberValuesQuery, UNATTRIBUTED } from './queries';

type Labels = Record<string, string>;

/** Whether a PromQL selector body such as `user_email="", enduser_id=~"$member"` matches `labels`. */
function selectorMatches(selector: string, labels: Labels, vars: Record<string, string>) {
  return [...selector.matchAll(/(\w+)(=~|!=|=)"([^"]*)"/g)].every(([, name, op, raw]) => {
    const value = labels[name] ?? '';
    const pattern = raw.replace(/\$(\w+)/g, (_, v) => vars[v] ?? `$${v}`);
    if (op === '=') {
      return value === pattern;
    }
    if (op === '!=') {
      return value !== pattern;
    }
    return new RegExp(`^(?:${pattern})$`).test(value);
  });
}

/** The selector bodies of every `<metric>{...}` in `expr`. */
const selectors = (expr: string, metric: string) =>
  [...expr.matchAll(new RegExp(`${metric}\\{([^}]*)\\}`, 'g'))].map((m) => m[1]);

/**
 * The `member` label `expr`'s label_replace chain gives a series. A call's
 * arguments come after the expression it wraps, so the text lists the calls in
 * the order they run.
 */
function memberOf(expr: string, labels: Labels) {
  const calls = [...expr.matchAll(/"member", "([^"]*)", "(\w+)", "([^"]*)"\)/g)].map((m) => ({
    replacement: m[1],
    source: m[2],
    regex: m[3],
  }));
  expect(calls.length).toBeGreaterThan(0);
  const out: Labels = { ...labels };
  for (const { replacement, source, regex } of calls) {
    const match = new RegExp(`^(?:${regex})$`).exec(out[source] ?? '');
    if (match) {
      out.member = replacement.replace('$1', match[1] ?? '');
    }
  }
  return out.member;
}

const SERIES: Array<{ labels: Labels; member: string }> = [
  { labels: { user_email: 'a@example.com', enduser_id: 'svc-a', user_id: 'u1' }, member: 'a@example.com' },
  { labels: { enduser_id: 'svc-b', user_id: 'u2' }, member: 'svc-b' },
  { labels: { user_id: 'u3' }, member: 'u3' },
  { labels: {}, member: UNATTRIBUTED },
];

describe.each(['prometheus', 'otlp'] as const)('buildQueries (%s metric names)', (format) => {
  const m = getMetrics(format);
  const queries = buildQueries(m, getFilterDimensions(['team.id']));
  const all = Object.entries(queries);

  it('uses only the metric names of its format', () => {
    expect(all.length).toBeGreaterThan(50);
    const names = new Set(Object.values(m));
    for (const [key, expr] of all) {
      for (const [metric] of expr.matchAll(/claude_code_\w+/g)) {
        expect({ key, metric, known: names.has(metric) }).toEqual({ key, metric, known: true });
      }
    }
  });

  it('filters every metric selector by every filter dimension', () => {
    let checked = 0;
    for (const [key, expr] of all) {
      for (const metric of Object.values(m)) {
        for (const selector of selectors(expr, metric)) {
          for (const matcher of ['vcs_repository_name=~"$repository"', 'team_id=~"$label_team_id"', 'user_groups=~']) {
            expect({ key, has: selector.includes(matcher) }).toEqual({ key, has: true });
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('matches a picked member on their email, else enduser_id, else user_id, exactly once', () => {
    const branches = selectors(queries.totalCost, m.COST_USAGE);
    expect(branches).toHaveLength(3);
    for (const { labels, member } of SERIES.slice(0, 3)) {
      const matching = branches.filter((s) =>
        selectorMatches(s, labels, { member, model: '.*', repository: '.*', team: '.*', label_team_id: '.*' })
      );
      expect({ member, matches: matching.length }).toEqual({ member, matches: 1 });
    }
    // Picking a member's user_id must not match their sessions that carry an email.
    const [withEmail] = SERIES;
    const byUserId = branches.filter((s) =>
      selectorMatches(s, withEmail.labels, {
        member: 'u1',
        model: '.*',
        repository: '.*',
        team: '.*',
        label_team_id: '.*',
      })
    );
    expect(byUserId).toHaveLength(0);
  });

  it('names each series in by-member breakdowns by its identity, or Unattributed', () => {
    for (const { labels, member } of SERIES) {
      expect(memberOf(queries.costByMember, labels)).toBe(member);
    }
  });
});

describe('count queries', () => {
  const queries = buildQueries(getMetrics());

  it('round the extrapolated increase() totals to whole numbers', () => {
    for (const key of [
      'totalLinesOfCode',
      'linesOfCodeByType',
      'totalCommits',
      'totalPullRequests',
      'toolDecisions',
      'toolDecisionsByTool',
    ] as const) {
      expect({ key, expr: queries[key] }).toEqual({
        key,
        expr: expect.stringMatching(/^round\(sum(?: by \(\w+\) )?\(.*\)\)$/),
      });
    }
    // Sorted breakdowns round inside sort_desc, so the order still comes from the rounded values.
    for (const key of ['linesOfCodeByModel', 'toolDecisionsBySource'] as const) {
      expect({ key, expr: queries[key] }).toEqual({
        key,
        expr: expect.stringMatching(/^sort_desc\(round\(sum by \(\w+\) .*\)\)$/),
      });
    }
  });
});

describe('memberValuesQuery', () => {
  it('lists identified members but never offers Unattributed', () => {
    const expr = memberValuesQuery(getMetrics());
    for (const { labels, member } of SERIES.slice(0, 3)) {
      expect(memberOf(expr, labels)).toBe(member);
    }
    expect(memberOf(expr, {})).toBeUndefined();
    expect(expr).not.toContain(UNATTRIBUTED);
  });
});

describe('changeVsPrevious', () => {
  it('compares against the same query shifted back one period', () => {
    const expr = 'sum(increase(a{x="1"}[$__range])) / sum(increase(b[$__range]))';
    const previous = 'sum(increase(a{x="1"}[$__range] offset $__range)) / sum(increase(b[$__range] offset $__range))';
    expect(changeVsPrevious(expr)).toBe(`((${expr} or ${previous} * 0) - ${previous}) / (${previous} > 0) * 100`);
  });
});
