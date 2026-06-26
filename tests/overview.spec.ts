import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import {
  MODELS,
  MEMBERS,
  TOKEN_TYPES,
  OS_TYPES,
  HOST_ARCHES,
  TERMINAL_TYPES,
  SERVICE_VERSIONS,
} from './mocks/prometheus';

test.describe('Overview scene', () => {
  test('renders the stat row with mocked totals', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText('487');
    await expect(panelByTitle(app, selectors, 'Total Tokens')).toContainText('842');
    await expect(panelByTitle(app, selectors, 'Sessions')).toContainText('7');
    await expect(panelByTitle(app, selectors, 'Active Users')).toContainText('3');
  });

  test('renders cost charts with model and member series', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const model of MODELS) {
      await expect(legendItem(app, selectors, 'Cost Over Time', model)).toBeVisible();
    }
    for (const member of MEMBERS) {
      await expect(legendItem(app, selectors, 'Cost by Team Member', member)).toBeVisible();
    }
  });

  test('renders token usage over time by token type', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const type of TOKEN_TYPES.slice(0, 3)) {
      await expect(legendItem(app, selectors, 'Token Usage Over Time', type)).toBeVisible();
    }
  });

  test('renders the environment pie charts', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    await expect(legendItem(app, selectors, 'OS Type', OS_TYPES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Architecture', HOST_ARCHES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Terminal', TERMINAL_TYPES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Claude Code Version', SERVICE_VERSIONS[0])).toBeVisible();
  });
});
