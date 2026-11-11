import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { DISPLAY, DECISIONS, DECISION_SOURCES, LANGUAGES, TOOLS } from './mocks/prometheus';

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
});
