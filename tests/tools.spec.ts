import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { DISPLAY, DECISIONS, DECISION_SOURCES, LANGUAGES, TOOLS, TOOL_PERFORMANCE } from './mocks/prometheus';

test.describe('Tools scene', () => {
  test('renders the acceptance rate stat', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tools');
    await expect(panelByTitle(app, selectors, 'Tool Acceptance Rate')).toContainText(DISPLAY.ToolAcceptanceRate);
  });

  test('renders tool decisions by type and over time', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tools');

    for (const decision of DECISIONS) {
      await expect(legendItem(app, selectors, 'Tool Decisions', decision)).toBeVisible();
      await expect(legendItem(app, selectors, 'Tool Decisions Over Time', decision)).toBeVisible();
    }
  });

  test('renders the usage-by-tool bar gauge', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tools');
    const panel = panelByTitle(app, selectors, 'Usage by Tool');

    for (const tool of TOOLS) {
      await expect(panel.getByText(tool, { exact: true }).first()).toBeVisible();
    }
  });

  test('renders acceptance rate by language', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tools');
    const panel = panelByTitle(app, selectors, 'Acceptance Rate by Language');

    for (const language of LANGUAGES) {
      await expect(panel.getByText(language, { exact: true }).first()).toBeVisible();
    }
  });

  test('renders decisions by source with readable names', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tools');

    for (const name of Object.values(DECISION_SOURCES)) {
      await expect(legendItem(app, selectors, 'Decisions by Source', name)).toBeVisible();
    }
  });

  test('renders tool performance from Loki events', async ({ mockData, gotoPage, selectors, page }) => {
    const app = await gotoPage('tools');
    await expect(page.getByTestId('data-testid template variable').filter({ hasText: 'Events' })).toBeVisible();

    const table = panelByTitle(app, selectors, 'Tool Performance');
    for (const column of ['Tool', 'Calls', 'Failure Rate', 'p50', 'p95']) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    // Most calls first; each row merges calls, failure rate and latencies.
    await expect(table.getByRole('row').nth(1)).toContainText('Read');
    const bash = table.getByRole('row').filter({ hasText: 'Bash' });
    await expect(bash).toContainText(String(TOOL_PERFORMANCE.calls.Bash));
    await expect(bash).toContainText(`${TOOL_PERFORMANCE.failureRate.Bash}%`);
    await expect(bash).toContainText(`${TOOL_PERFORMANCE.p50.Bash}.0 ms`);

    for (const errorType of Object.keys(TOOL_PERFORMANCE.errorTypes)) {
      await expect(legendItem(app, selectors, 'Failures by Error Type', errorType)).toBeVisible();
    }
    for (const source of Object.keys(TOOL_PERFORMANCE.p95BySource)) {
      await expect(legendItem(app, selectors, 'p95 Execution Time by Decision Source', source)).toBeVisible();
    }
  });
});
