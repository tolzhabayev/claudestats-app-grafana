import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { legendItem } from './mocks/panels';
import { REPOSITORIES } from './mocks/prometheus';

const picker = (page: Page, label: string) =>
  page.getByTestId('data-testid template variable').filter({ hasText: label });

/** Makes the app see these filter labels in its saved settings (jsonData.customLabels). */
async function withCustomLabels(page: Page, customLabels: string[]) {
  await page.route('**/api/plugins/*/settings', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const settings = await response.json();
    await route.fulfill({ response, json: { ...settings, jsonData: { ...settings.jsonData, customLabels } } });
  });
}

test.describe('Filter dimensions', () => {
  test('shows the Repository picker when repositories are reported', async ({ mockData, gotoPage, page }) => {
    for (const path of ['costs', 'tools']) {
      await gotoPage(path);
      await expect(picker(page, 'Repository')).toBeVisible();
    }
  });

  test('hides the Repository picker when no repository label exists', async ({ mockData, gotoPage, page }) => {
    // Registered after mockData, so it takes precedence for this label.
    await page.route('**/api/datasources/**/resources/**/label/vcs_repository_name/values*', (route) =>
      route.fulfill({ json: { status: 'success', data: [] } })
    );

    for (const path of ['costs', 'tools']) {
      await gotoPage(path);
      await expect(picker(page, 'Team Member')).toBeVisible();
      await expect(picker(page, 'Repository')).toHaveCount(0);
    }
  });

  test('every panel query carries the repository filter', async ({ mockData, gotoPage, page }) => {
    const exprs: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/ds/query')) {
        const body = request.postDataJSON() as { queries?: Array<{ expr?: string }> };
        exprs.push(...(body.queries ?? []).map((q) => q.expr ?? ''));
      }
    });

    for (const path of ['', 'costs', 'tokens', 'tools', 'productivity']) {
      const app = await gotoPage(path);
      await app.waitForQueryDataResponse();
    }

    expect(exprs.length).toBeGreaterThan(0);
    for (const expr of exprs) {
      expect(expr).toContain('vcs_repository_name=~');
    }
  });

  test('renders cost and tokens by repository', async ({ mockData, gotoPage, selectors }) => {
    for (const [path, title] of [
      ['costs', 'Cost by Repository'],
      ['tokens', 'Tokens by Repository'],
    ]) {
      const app = await gotoPage(path);
      for (const repo of REPOSITORIES) {
        await expect(legendItem(app, selectors, title, repo)).toBeVisible();
      }
    }
  });

  test('adds a picker and a query filter for each configured label', async ({ mockData, gotoPage, page }) => {
    await withCustomLabels(page, ['team.id']);

    const scoped = page.waitForRequest((request) => {
      if (!request.url().includes('/api/ds/query')) {
        return false;
      }
      const body = request.postDataJSON() as { queries?: Array<{ expr?: string }> };
      return (body.queries ?? []).some((q) => (q.expr ?? '').includes('team_id=~'));
    });

    await gotoPage('productivity');
    await expect(picker(page, 'team.id')).toBeVisible();
    await scoped;
  });
});
