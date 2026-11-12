import { test, expect } from './fixtures';
import { legendItem, panelByTitle } from './mocks/panels';
import { RELIABILITY } from './mocks/prometheus';

test.describe('Reliability scene', () => {
  test('renders the totals', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('reliability');

    await expect(panelByTitle(app, selectors, 'API Errors')).toContainText(String(RELIABILITY.apiErrors));
    await expect(panelByTitle(app, selectors, 'Error Rate')).toContainText(`${RELIABILITY.errorRate}%`);
    await expect(panelByTitle(app, selectors, 'Retries Exhausted')).toContainText(String(RELIABILITY.retriesExhausted));
    await expect(panelByTitle(app, selectors, 'Refusals')).toContainText(String(RELIABILITY.refusals));
  });

  test('renders errors over time by status, with a bucket for non-HTTP errors', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage('reliability');

    for (const status of Object.keys(RELIABILITY.errorsByStatus)) {
      await expect(legendItem(app, selectors, 'API Errors Over Time', status)).toBeVisible();
    }
  });

  test('renders the error and refusal breakdowns', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('reliability');

    const breakdowns: Array<[string, Record<string, number>]> = [
      ['Errors by Model', RELIABILITY.errorsByModel],
      ['Errors by Attempts', RELIABILITY.errorsByAttempt],
      ['Refusals by Category', RELIABILITY.refusalsByCategory],
      ['Refusals by Model', RELIABILITY.refusalsByModel],
    ];
    for (const [title, values] of breakdowns) {
      for (const name of Object.keys(values)) {
        await expect(legendItem(app, selectors, title, name)).toBeVisible();
      }
    }
  });

  test('queries Loki through the Events picker, with the member and model filters', async ({
    mockData,
    gotoPage,
    page,
  }) => {
    const picker = (label: string) => page.getByTestId('data-testid template variable').filter({ hasText: label });
    const lokiQuery = page.waitForRequest((request) => {
      if (!request.url().includes('/api/ds/query')) {
        return false;
      }
      const body = request.postDataJSON() as {
        queries?: Array<{ datasource?: { type?: string }; expr?: string }>;
      };
      return (body.queries ?? []).some(
        (q) =>
          q.datasource?.type === 'loki' &&
          (q.expr ?? '').includes('event_name=~"api_error"') &&
          (q.expr ?? '').includes('user_email=~') &&
          (q.expr ?? '').includes('model=~')
      );
    });

    await gotoPage('reliability');
    await expect(picker('Events')).toBeVisible();
    await expect(picker('Team Member')).toBeVisible();
    await expect(picker('Model')).toBeVisible();
    await lokiQuery;
  });

  test('keeps the Events picker off the metrics tabs', async ({ mockData, gotoPage, page }) => {
    await gotoPage('costs');
    await expect(page.getByTestId('data-testid template variable').filter({ hasText: 'Team Member' })).toBeVisible();
    await expect(page.getByTestId('data-testid template variable').filter({ hasText: 'Events' })).toHaveCount(0);
  });
});
