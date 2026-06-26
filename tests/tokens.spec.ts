import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { MODELS, MEMBERS, TOKEN_TYPES } from './mocks/prometheus';

test.describe('Tokens scene', () => {
  test('renders the token stat row', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tokens');

    await expect(panelByTitle(app, selectors, 'Total Tokens')).toContainText('842');
    await expect(panelByTitle(app, selectors, 'Input Tokens')).toContainText('420');
    await expect(panelByTitle(app, selectors, 'Output Tokens')).toContainText('330');
    await expect(panelByTitle(app, selectors, 'Cache Read')).toContainText('92');
  });

  test('renders token distribution and usage over time by type', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tokens');

    for (const type of TOKEN_TYPES) {
      await expect(legendItem(app, selectors, 'Token Distribution by Type', type)).toBeVisible();
    }
    for (const type of TOKEN_TYPES.slice(0, 3)) {
      await expect(legendItem(app, selectors, 'Token Usage Over Time', type)).toBeVisible();
    }
  });

  test('renders tokens by model and by member', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tokens');

    for (const model of MODELS) {
      await expect(legendItem(app, selectors, 'Tokens by Model', model)).toBeVisible();
    }
    for (const member of MEMBERS) {
      await expect(legendItem(app, selectors, 'Tokens by Team Member', member)).toBeVisible();
    }
  });
});
