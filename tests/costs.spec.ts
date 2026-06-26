import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { MODELS, MEMBERS } from './mocks/prometheus';

test.describe('Costs scene', () => {
  test('renders the total cost stat', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');
    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText('487');
  });

  test('renders cost-by-model and cost-by-member pies', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const model of MODELS) {
      await expect(legendItem(app, selectors, 'Cost by Model', model)).toBeVisible();
    }
    for (const member of MEMBERS) {
      await expect(legendItem(app, selectors, 'Cost Distribution by Member', member)).toBeVisible();
    }
  });

  test('renders the over-time charts by model and member', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const model of MODELS) {
      await expect(legendItem(app, selectors, 'Cost Over Time by Model', model)).toBeVisible();
    }
    for (const member of MEMBERS) {
      await expect(legendItem(app, selectors, 'Cost Over Time by Team Member', member)).toBeVisible();
    }
  });

  test('renders the cost breakdown table with member and model columns', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');
    const table = panelByTitle(app, selectors, 'Cost Breakdown');

    // Column override from the scene definition.
    await expect(table).toContainText('Team Member');
    for (const member of MEMBERS) {
      await expect(table.getByText(member, { exact: true }).first()).toBeVisible();
    }
    for (const model of MODELS) {
      await expect(table.getByText(model, { exact: true }).first()).toBeVisible();
    }
  });
});
