import { dimensionMatcher, getFilterDimensions, isUsableCustomLabel, TEAM_DIMENSION, toLabelName } from './dimensions';

/** Prometheus matches `=~` regexes against the whole value. */
const fullMatch = (pattern: string, value: string) => new RegExp(`^(?:${pattern})$`).test(value);

describe('toLabelName', () => {
  it('turns an OTel attribute into the Prometheus label it becomes', () => {
    expect(toLabelName('team.id')).toBe('team_id');
    expect(toLabelName(' cost-center ')).toBe('cost_center');
    expect(toLabelName('org/unit name')).toBe('org_unit_name');
  });

  it('rejects names that are not valid labels', () => {
    expect(toLabelName('1team')).toBeNull();
    expect(toLabelName('__name__')).toBeNull();
    expect(toLabelName('team:id')).toBeNull();
    expect(toLabelName('')).toBeNull();
  });
});

describe('isUsableCustomLabel', () => {
  it('rejects labels the app already filters or groups by', () => {
    for (const reserved of [
      'user.email',
      'enduser.id',
      'user.id',
      'member',
      'model',
      'vcs.repository.name',
      'user.groups',
    ]) {
      expect(isUsableCustomLabel(reserved)).toBe(false);
    }
    expect(isUsableCustomLabel('team.id')).toBe(true);
  });
});

describe('getFilterDimensions', () => {
  it('puts Repository and Team first, then the configured labels', () => {
    expect(getFilterDimensions(['team.id', 'cost_center']).map((d) => d.label)).toEqual([
      'vcs_repository_name',
      'user_groups',
      'team_id',
      'cost_center',
    ]);
  });

  it('drops invalid, reserved and duplicate labels', () => {
    const custom = getFilterDimensions(['team.id', 'team_id', 'model', '9bad', 'project']).slice(2);
    expect(custom).toEqual([
      { label: 'team_id', variable: 'label_team_id', title: 'team.id', hideWhenEmpty: false },
      { label: 'project', variable: 'label_project', title: 'project', hideWhenEmpty: false },
    ]);
  });
});

describe('dimensionMatcher', () => {
  it('matches a plain label on the picked value', () => {
    expect(dimensionMatcher(getFilterDimensions(['team.id'])[2])).toBe('team_id=~"$label_team_id"');
  });

  it('matches a comma-separated label when the picked group is one of its items', () => {
    const matcher = dimensionMatcher(TEAM_DIMENSION);
    const pattern = (picked: string) => matcher.replace(/^user_groups=~"(.*)"$/, '$1').replace('$team', picked);

    for (const groups of ['platform', 'eng,platform', 'platform,eng', 'eng,platform,data']) {
      expect(fullMatch(pattern('platform'), groups)).toBe(true);
    }
    for (const groups of ['platforms', 'eng,platform-ops', 'my-platform', '']) {
      expect(fullMatch(pattern('platform'), groups)).toBe(false);
    }
    // "All" matches every series.
    expect(fullMatch(pattern('.*'), 'eng,platform')).toBe(true);
  });
});
