import { test, expect } from './fixtures';
import { panelByTitle } from './mocks/panels';
import { TRACES } from './mocks/prometheus';

test.describe('Traces scene', () => {
  test('lists interactions and links each one to its trace, keeping the filters', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    const app = await gotoPage('traces');
    const picker = (label: string) => page.getByTestId('data-testid template variable').filter({ hasText: label });
    await expect(picker('Traces')).toBeVisible();
    await expect(picker('Trace ID')).toBeVisible();

    const table = panelByTitle(app, selectors, 'Interactions');
    const traceId = TRACES.interactions[0].traceID;
    await table.getByText(traceId, { exact: true }).click();
    // With Tempo's own Explore link on the field too, Grafana shows a menu of links first.
    const menuLink = page.getByRole('link', { name: 'Show this trace' });
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
    }
    await expect(page).toHaveURL(new RegExp(`/traces\\?.*var-trace=${traceId}`));
    await expect(page).toHaveURL(/var-member=/);
    await expect(panelByTitle(app, selectors, 'Trace')).toContainText('claude_code.interaction');
  });

  test('queries Claude Code interactions in Tempo with the member filter', async ({ mockData, gotoPage, page }) => {
    const search = page.waitForRequest((request) => {
      if (!request.url().includes('/api/ds/query')) {
        return false;
      }
      const body = request.postDataJSON() as { queries?: Array<{ datasource?: { type?: string }; query?: string }> };
      return (body.queries ?? []).some(
        (q) =>
          q.datasource?.type === 'tempo' &&
          (q.query ?? '').includes('name="claude_code.interaction"') &&
          (q.query ?? '').includes('!(.user.email != nil)')
      );
    });
    await gotoPage('traces');
    await search;
  });

  test('asks for a trace and sends no trace query until one is picked', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    const traceQueries: string[] = [];
    page.on('request', (request) => {
      if (!request.url().includes('/api/ds/query')) {
        return;
      }
      const body = request.postDataJSON() as { queries?: Array<{ refId?: string; query?: string }> };
      for (const q of body.queries ?? []) {
        if (q.refId === 'Trace') {
          traceQueries.push(q.query ?? '');
        }
      }
    });
    const app = await gotoPage('traces');
    const trace = panelByTitle(app, selectors, 'Trace');
    await expect(trace).toContainText('Click a trace ID above');
    // The lists have loaded, so any trace query would have been sent by now.
    await expect(panelByTitle(app, selectors, 'Interactions')).toContainText(TRACES.interactions[0].traceID);
    expect(traceQueries).toEqual([]);
  });

  test('shows the picked trace as a waterfall', async ({ mockData, gotoPage, page, selectors }) => {
    await gotoPage(`traces?var-trace=${TRACES.interactions[0].traceID}`);
    const app = await gotoPage(`traces?var-trace=${TRACES.interactions[0].traceID}`);
    const trace = panelByTitle(app, selectors, 'Trace');
    await expect(trace).toContainText('claude_code.interaction');
    await expect(trace).toContainText('claude_code.tool.execution');
  });
});
