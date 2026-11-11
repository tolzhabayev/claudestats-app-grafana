import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { ACTIVE_TIME_TYPES, DISPLAY, MEMBERS, LOC_TYPES } from './mocks/prometheus';

test.describe('Productivity scene', () => {
  test('renders the productivity stat row', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('productivity');

    await expect(panelByTitle(app, selectors, 'Lines of Code')).toContainText(DISPLAY.TotalLinesOfCode);
    await expect(panelByTitle(app, selectors, 'Commits')).toContainText(DISPLAY.TotalCommits);
    await expect(panelByTitle(app, selectors, 'Pull Requests')).toContainText(DISPLAY.TotalPullRequests);
    await expect(panelByTitle(app, selectors, 'Active Time')).toContainText(DISPLAY.TotalActiveTime);
  });

  test('renders lines-of-code charts split by type', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('productivity');

    for (const type of LOC_TYPES) {
      await expect(legendItem(app, selectors, 'Lines Added vs Removed', type)).toBeVisible();
      await expect(legendItem(app, selectors, 'Lines of Code Over Time', type)).toBeVisible();
    }
  });

  test('renders the commit and pull-request time series', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('productivity');

    // These panels have a single unnamed series, so assert the chart drew.
    await expect(panelByTitle(app, selectors, 'Commits Over Time').locator('canvas')).toBeVisible();
    await expect(panelByTitle(app, selectors, 'Pull Requests Over Time').locator('canvas')).toBeVisible();
  });

  test('renders active time per team member', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('productivity');
    const panel = panelByTitle(app, selectors, 'Active Time by Team Member');

    for (const member of MEMBERS) {
      await expect(panel.getByText(member, { exact: true }).first()).toBeVisible();
    }
  });

  test('splits active time into user and CLI time', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('productivity');

    for (const name of Object.values(ACTIVE_TIME_TYPES)) {
      await expect(legendItem(app, selectors, 'Active Time: User vs CLI', name)).toBeVisible();
    }
  });
});
