import { readFileSync } from 'fs';
import { join } from 'path';

// The changelog is shown on grafana.com, where #123 and relative links don't resolve.
const changelog = readFileSync(join(__dirname, '..', 'CHANGELOG.md'), 'utf8');

describe('CHANGELOG.md', () => {
  it('links every issue and PR reference', () => {
    const withoutLinks = changelog.replace(/\[[^\]]*\]\([^)]*\)/g, '');
    expect(withoutLinks.match(/#\d+/g) ?? []).toEqual([]);
  });

  it('uses absolute links only', () => {
    const targets = [...changelog.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((t) => !t.startsWith('https://'))).toEqual([]);
  });
});
