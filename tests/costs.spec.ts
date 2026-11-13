import { test, expect } from './fixtures';
import { barFillWidths, panelByTitle, legendItem } from './mocks/panels';
import {
  mockEmptyPanels,
  DISPLAY,
  MODELS,
  MEMBERS,
  QUERY_SOURCES,
  AGENTS,
  SKILLS,
  MCP_SERVERS,
  MCP_TOOLS,
  PLUGINS,
  mcpToolLabel,
  SPEEDS,
  EFFORTS,
} from './mocks/prometheus';

test.describe('Costs scene', () => {
  test('renders the total cost stat', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');
    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText(DISPLAY.TotalCost);
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

  test('bar gauges start at zero, so the smallest bar is still drawn', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const title of ['Cost by Query Source', 'Cost by Subagent', 'Cost by MCP Server']) {
      const widths = await barFillWidths(panelByTitle(app, selectors, title));
      expect(widths.length, title).toBeGreaterThan(1);
      // Scaled from the smallest value, the last bar was drawn with no fill at all.
      expect(Math.min(...widths), title).toBeGreaterThan(2);
    }
  });

  test('bar gauges with few bars keep their text small instead of scaling it to the panel', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage('costs');

    // Two bars each, which Grafana would otherwise draw at heading size.
    for (const title of ['Cost by Subagent', 'Cost by Speed (Fast Mode)']) {
      const value = panelByTitle(app, selectors, title).getByTestId('data-testid Bar gauge value').first();
      await expect(value).toBeVisible();
      const size = await value.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size, title).toBeLessThanOrEqual(16);
    }
  });

  test('renders the attribution bar gauges by source, subagent, skill, and MCP server', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
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

  test('renders the plugin and MCP tool attribution bar gauges', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('costs');

    for (const plugin of PLUGINS) {
      await expect(legendItem(app, selectors, 'Cost by Plugin', plugin)).toBeVisible();
    }
    for (const tool of MCP_TOOLS) {
      await expect(legendItem(app, selectors, 'Cost by MCP Tool', mcpToolLabel(tool))).toBeVisible();
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

  test('says when nothing used a subagent, skill, MCP tool or plugin', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    await mockEmptyPanels(page, ['CostByAgent', 'CostBySkill', 'CostByMcpServer', 'CostByMcpTool', 'CostByPlugin']);
    const app = await gotoPage('costs');
    await expect(panelByTitle(app, selectors, 'Cost by Subagent')).toContainText('No subagent ran in this period');
    await expect(panelByTitle(app, selectors, 'Cost by Skill')).toContainText('No skill was active in this period');
    await expect(panelByTitle(app, selectors, 'Cost by MCP Tool')).toContainText('No MCP tool result was used');
    await expect(panelByTitle(app, selectors, 'Cost by Plugin')).toContainText('No plugin skill or subagent ran');
  });
});
