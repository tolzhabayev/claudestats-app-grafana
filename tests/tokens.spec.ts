import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import {
  DISPLAY,
  MODELS,
  MEMBERS,
  TOKEN_TYPES,
  QUERY_SOURCES,
  AGENTS,
  SKILLS,
  MCP_SERVERS,
  SPEEDS,
  EFFORTS,
} from './mocks/prometheus';

test.describe('Tokens scene', () => {
  test('renders the token stat row', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tokens');

    await expect(panelByTitle(app, selectors, 'Total Tokens')).toContainText(DISPLAY.TotalTokens);
    await expect(panelByTitle(app, selectors, 'Input Tokens')).toContainText(DISPLAY.InputTokens);
    await expect(panelByTitle(app, selectors, 'Output Tokens')).toContainText(DISPLAY.OutputTokens);
    await expect(panelByTitle(app, selectors, 'Cache Read')).toContainText(DISPLAY.CacheReadTokens);
  });

  test('queries cache reads with the token type label Claude Code emits', async ({ mockData, gotoPage }) => {
    // Claude Code labels token types `cacheRead` / `cacheCreation` (camelCase).
    // The mocks answer by refId, so assert on the PromQL itself.
    const app = await gotoPage('tokens');
    const request = await app.waitForQueryDataRequest((req) => {
      const body = req.postDataJSON() as { queries?: Array<{ refId?: string }> };
      return (body.queries ?? []).some((q) => q.refId === 'CacheReadTokens');
    });
    const body = request.postDataJSON() as { queries: Array<{ refId: string; expr: string }> };
    const expr = body.queries.find((q) => q.refId === 'CacheReadTokens')!.expr;
    expect(expr).toContain('type="cacheRead"');
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

  test('renders the attribution bar gauges by source, subagent, skill, and MCP server', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage('tokens');

    for (const source of QUERY_SOURCES) {
      await expect(legendItem(app, selectors, 'Tokens by Query Source', source)).toBeVisible();
    }
    for (const agent of AGENTS) {
      await expect(legendItem(app, selectors, 'Tokens by Subagent', agent)).toBeVisible();
    }
    for (const skill of SKILLS) {
      await expect(legendItem(app, selectors, 'Tokens by Skill', skill)).toBeVisible();
    }
    for (const server of MCP_SERVERS) {
      await expect(legendItem(app, selectors, 'Tokens by MCP Server', server)).toBeVisible();
    }
  });

  test('renders the speed and effort attribution bar gauges', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('tokens');

    for (const speed of SPEEDS) {
      await expect(legendItem(app, selectors, 'Tokens by Speed (Fast Mode)', speed)).toBeVisible();
    }
    for (const effort of EFFORTS) {
      await expect(legendItem(app, selectors, 'Tokens by Effort', effort)).toBeVisible();
    }
  });
});
