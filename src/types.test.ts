import { parseTeamMembers, formatTeamMembers } from './types';

describe('parseTeamMembers', () => {
  it('should return empty object for empty string', () => {
    expect(parseTeamMembers('')).toEqual({});
  });

  it('should return empty object for undefined', () => {
    expect(parseTeamMembers(undefined as unknown as string)).toEqual({});
  });

  it('should parse single mapping', () => {
    expect(parseTeamMembers('abc-123|John Smith')).toEqual({
      'abc-123': 'John Smith',
    });
  });

  it('should parse multiple mappings', () => {
    const input = `abc-123|John Smith
def-456|Jane Doe`;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    });
  });

  it('should skip empty lines', () => {
    const input = `abc-123|John Smith

def-456|Jane Doe`;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    });
  });

  it('should skip comment lines', () => {
    const input = `# This is a comment
abc-123|John Smith
# Another comment
def-456|Jane Doe`;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    });
  });

  it('should trim whitespace', () => {
    const input = `  abc-123  |  John Smith  `;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John Smith',
    });
  });

  it('should skip lines without separator', () => {
    const input = `abc-123|John Smith
invalid line
def-456|Jane Doe`;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    });
  });

  it('should handle names with pipe characters', () => {
    const input = `abc-123|John | Smith`;
    expect(parseTeamMembers(input)).toEqual({
      'abc-123': 'John | Smith',
    });
  });

  it('should skip mappings with empty UUID', () => {
    const input = `|John Smith`;
    expect(parseTeamMembers(input)).toEqual({});
  });

  it('should skip mappings with empty name', () => {
    const input = `abc-123|`;
    expect(parseTeamMembers(input)).toEqual({});
  });
});

describe('formatTeamMembers', () => {
  it('should return empty string for empty object', () => {
    expect(formatTeamMembers({})).toBe('');
  });

  it('should format single mapping', () => {
    expect(formatTeamMembers({ 'abc-123': 'John Smith' })).toBe('abc-123|John Smith');
  });

  it('should format multiple mappings', () => {
    const result = formatTeamMembers({
      'abc-123': 'John Smith',
      'def-456': 'Jane Doe',
    });
    expect(result).toContain('abc-123|John Smith');
    expect(result).toContain('def-456|Jane Doe');
    expect(result.split('\n').length).toBe(2);
  });
});
