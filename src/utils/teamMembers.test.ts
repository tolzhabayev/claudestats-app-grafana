// Mock Grafana dependencies
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(),
  getDataSourceSrv: jest.fn(),
}));

jest.mock('@grafana/scenes', () => ({
  SceneDataTransformer: jest.fn(),
  SceneQueryRunner: jest.fn(),
}));

jest.mock('@grafana/data', () => ({
  MappingType: {
    ValueToText: 'value',
    RangeToText: 'range',
    RegexToText: 'regex',
    SpecialValue: 'special',
  },
}));

import { createTeamMemberRenameTransformations, createTeamMemberValueMappings, getTeamMemberName } from './teamMembers';

describe('getTeamMemberName', () => {
  it('should return name when mapping exists', () => {
    const mappings = { 'abc-123': 'John Smith' };
    expect(getTeamMemberName('abc-123', mappings)).toBe('John Smith');
  });

  it('should return UUID when no mapping exists', () => {
    const mappings = { 'abc-123': 'John Smith' };
    expect(getTeamMemberName('def-456', mappings)).toBe('def-456');
  });

  it('should return UUID for empty mappings', () => {
    expect(getTeamMemberName('abc-123', {})).toBe('abc-123');
  });
});

describe('createTeamMemberRenameTransformations', () => {
  it('should return empty array for empty mappings', () => {
    expect(createTeamMemberRenameTransformations({})).toEqual([]);
  });

  it('should create rename transformation for single mapping', () => {
    const mappings = { 'abc-123': 'John Smith' };
    const result = createTeamMemberRenameTransformations(mappings);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('renameByRegex');
    expect(result[0].options.renamePattern).toContain('John Smith');
  });

  it('should create transformations for multiple mappings', () => {
    const mappings = {
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    };
    const result = createTeamMemberRenameTransformations(mappings);

    expect(result).toHaveLength(2);
  });

  it('should escape special regex characters in UUID', () => {
    const mappings = { 'abc.123': 'John Smith' };
    const result = createTeamMemberRenameTransformations(mappings);

    expect(result[0].options.regex).toContain('abc\\.123');
  });
});

describe('createTeamMemberValueMappings', () => {
  it('should return single mapping entry for empty mappings', () => {
    const result = createTeamMemberValueMappings({});

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('value');
    expect(result[0].options).toEqual({});
  });

  it('should create value mapping for single entry', () => {
    const mappings = { 'abc-123': 'John Smith' };
    const result = createTeamMemberValueMappings(mappings);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('value');
    const options = result[0].options as Record<string, { text: string; index: number }>;
    expect(options['abc-123']).toEqual({ text: 'John Smith', index: 0 });
  });

  it('should create value mappings for multiple entries', () => {
    const mappings = {
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    };
    const result = createTeamMemberValueMappings(mappings);

    expect(result).toHaveLength(1);
    const options = result[0].options as Record<string, { text: string; index: number }>;
    expect(options['abc-123'].text).toBe('John Smith');
    expect(options['def-456'].text).toBe('Jane Doe');
  });
});
