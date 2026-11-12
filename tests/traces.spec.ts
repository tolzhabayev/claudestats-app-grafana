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
    // The ID is wider than its column, so click its visible start, as a person would.
    await table.getByText(traceId, { exact: true }).click({ position: { x: 10, y: 5 } });
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

  test('lists model requests with readable columns and links each one to its trace', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    const app = await gotoPage('traces');
    const table = panelByTitle(app, selectors, 'Model Requests');
    await expect(table.getByRole('columnheader')).toHaveText([
      'Start time',
      'Model',
      'First token',
      'Duration',
      'Stop reason',
      'Trace ID',
    ]);
    const first = TRACES.llmRequests[0];
    await expect(table).toContainText(first.model);
    // ttft_ms 1840 in ms, duration 9.6e9 in ns
    await expect(table).toContainText('1.84 s');
    await expect(table).toContainText('9.60 s');
    // The row whose root span hasn't arrived has an empty trace name: the hint must not fill it.
    await expect(table).not.toContainText('No traces');

    await table
      .getByText(first.traceID, { exact: true })
      .first()
      .click({ position: { x: 10, y: 5 } });
    await expect(page).toHaveURL(new RegExp(`/traces\\?.*var-trace=${first.traceID}`));
    await expect(page).toHaveURL(/var-member=/);
    await expect(panelByTitle(app, selectors, 'Trace')).toContainText('claude_code.interaction');
  });

  test('shows the picked trace as a waterfall', async ({ mockData, gotoPage, page, selectors }) => {
    await gotoPage(`traces?var-trace=${TRACES.interactions[0].traceID}`);
    const app = await gotoPage(`traces?var-trace=${TRACES.interactions[0].traceID}`);
    const trace = panelByTitle(app, selectors, 'Trace');
    await expect(trace).toContainText('claude_code.interaction');
    await expect(trace).toContainText('claude_code.tool.execution');
  });
});
