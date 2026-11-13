import { getFilterDimensions } from './dimensions';
import { buildLogQueries } from './logQueries';
import { buildTraceQueries } from './traceQueries';

const queries = buildLogQueries(getFilterDimensions(['team.id']));
const all = Object.entries(queries).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

describe('buildLogQueries', () => {
  it('drops events that lack the unwrapped attribute instead of failing the query', () => {
    let unwraps = 0;
    for (const [key, expr] of all) {
      for (const match of expr.matchAll(/\| unwrap \w+( \| [^|[]*)?/g)) {
        unwraps++;
        expect({ key, next: match[1]?.trim() }).toEqual({ key, next: '| __error__=""' });
      }
    }
    expect(unwraps).toBeGreaterThan(5);
  });

  it('filters every Claude Code stream by the members and every filter dimension', () => {
    let streams = 0;
    for (const [key, expr] of all) {
      // Each stream selector is followed by its pipeline up to the range or the next stream.
      for (const [pipeline] of expr.matchAll(/\{service_name="claude-code"\}[^[]*/g)) {
        streams++;
        for (const matcher of [
          'user_email=~"$member"',
          'vcs_repository_name=~"$repository"',
          'team_id=~"$label_team_id"',
          'user_groups=~',
        ]) {
          expect({ key, has: pipeline.includes(matcher) }).toEqual({ key, has: true });
        }
      }
    }
    expect(streams).toBeGreaterThan(50);
  });

  it('counts fall back to 0 when there are API requests, so an empty period reads 0', () => {
    for (const key of ['apiErrors', 'retriesExhausted', 'refusals'] as const) {
      expect(queries[key]).toMatch(
        / or sum\(count_over_time\(\{service_name="claude-code"\} \| event_name=~"api_error\|api_request".*\) \* 0$/
      );
    }
  });
});

describe('event check', () => {
  it('counts any Claude Code event under the same member and dimension filters', () => {
    const [pipeline] = queries.anyEvents.match(/\{service_name="claude-code"\}[^[]*/) ?? [''];
    expect(queries.anyEvents).toMatch(/^sum\(count_over_time\(\{service_name="claude-code"\} \| event_name=~"\.\+" /);
    for (const matcher of [
      'user_email=~"$member"',
      'vcs_repository_name=~"$repository"',
      'team_id=~"$label_team_id"',
    ]) {
      expect(pipeline).toContain(matcher);
    }
  });
});

describe('Reliability event check', () => {
  it('counts API requests and errors under the same model filter as the panels', () => {
    expect(queries.anyRequests).toContain('event_name=~"api_error|api_request"');
    expect(queries.anyRequests).toContain('model=~"$model"');
    expect(queries.apiErrors).toContain('model=~"$model"');
  });
});

describe('buildTraceQueries', () => {
  it('scopes spans to a member by email, else enduser.id, else user.id', () => {
    const { interactions, llmRequests } = buildTraceQueries();
    for (const expr of [interactions, llmRequests]) {
      expect(expr).toContain('(.user.email =~ "$member")');
      expect(expr).toContain('(!(.user.email != nil) && .enduser.id =~ "$member")');
      expect(expr).toContain('(!(.user.email != nil) && !(.enduser.id != nil) && .user.id =~ "$member")');
    }
  });
});
