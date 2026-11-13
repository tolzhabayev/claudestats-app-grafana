import { getFilterDimensions, TEAM_DIMENSION } from './dimensions';
import { getDimensionVariable } from './variables';

const queryOf = (variable: ReturnType<typeof getDimensionVariable>) => {
  const { query } = variable.state;
  return typeof query === 'string' ? query : String((query as { query?: unknown }).query);
};

describe('Team picker', () => {
  const variable = getDimensionVariable(TEAM_DIMENSION);
  const query = queryOf(variable);
  /** The item each label_replace copies out of `user_groups`, as Prometheus would (anchored). */
  const items = (groups: string) =>
    [...query.matchAll(/"item", "\$1", "user_groups", "([^"]+)"/g)]
      .map(([, regex]) => new RegExp(`^(?:${regex})$`).exec(groups)?.[1])
      .filter((item): item is string => item !== undefined);

  it('lists each group of a comma-separated user_groups value', () => {
    expect(items('eng')).toEqual(['eng']);
    expect(items('eng,platform,data')).toEqual(['eng', 'platform', 'data']);
  });

  it('keeps only the item label, so other labels never become options', () => {
    expect(query).toMatch(/^query_result\(count by \(item\) \(/);
    expect(query).toContain('count by (user_groups) (last_over_time(');
  });

  it('reads the item from each result line, quotes included', () => {
    const regex = variable.state.regex.replace(/^\/|\/$/g, '');
    expect(new RegExp(regex).exec('{item="say \\"hi\\" team"} 1 1700000000')?.[1]).toBe('say \\"hi\\" team');
  });
});

describe('configured label picker', () => {
  it('lists the values of the label on any Claude Code metric', () => {
    const [, , teamId] = getFilterDimensions(['team.id']);
    expect(queryOf(getDimensionVariable(teamId))).toBe('label_values({__name__=~"claude_code_.+"}, team_id)');
  });
});
