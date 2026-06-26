import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import { MODELS, MEMBERS, QUERY_SOURCES, AGENTS, SKILLS, MCP_SERVERS, SPEEDS, EFFORTS } from './mocks/prometheus';

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

  test('renders the attribution bar gauges by source, subagent, skill, and MCP server', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const source of QUERY_SOURCES) {
      await expect(legendItem(app, selectors, 'Cost by Query Source', source)).toBeVisible();
    }
    for (const agent of AGENTS) {
      await expect(legendItem(app, selectors, 'Cost by Subagent', agent)).toBeVisible();
    }
    for (const skill of SKILLS) {
      await expect(legendItem(app, selectors, 'Cost by Skill', skill)).toBeVisible();
    }
    for (const server of MCP_SERVERS) {
      await expect(legendItem(app, selectors, 'Cost by MCP Server', server)).toBeVisible();
    }
  });

  test('renders the speed and effort attribution bar gauges', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const speed of SPEEDS) {
      await expect(legendItem(app, selectors, 'Cost by Speed (Fast Mode)', speed)).toBeVisible();
    }
    for (const effort of EFFORTS) {
      await expect(legendItem(app, selectors, 'Cost by Effort', effort)).toBeVisible();
    }
  });
});
