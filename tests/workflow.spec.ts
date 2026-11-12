import { test, expect } from './fixtures';
import { legendItem, panelByTitle } from './mocks/panels';
import { WORKFLOW } from './mocks/prometheus';

test.describe('Workflow scene', () => {
  test('renders request latency by model, by effort and cache lifetimes', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('workflow');

    const latency = panelByTitle(app, selectors, 'Request Latency by Model');
    for (const column of ['Model', 'Requests', 'p50', 'p95']) {
      await expect(latency.getByRole('columnheader', { name: column })).toBeVisible();
    }
    for (const [model, n] of Object.entries(WORKFLOW.requests)) {
      await expect(latency.getByRole('row').filter({ hasText: model })).toContainText(String(n));
    }
    for (const effort of Object.keys(WORKFLOW.latencyByEffort)) {
      await expect(legendItem(app, selectors, 'p95 Latency by Effort', effort)).toBeVisible();
    }
    for (const lifetime of Object.keys(WORKFLOW.cacheWrites)) {
      await expect(legendItem(app, selectors, 'Cache Writes by Lifetime', lifetime)).toBeVisible();
    }
  });

  test('renders subagents, compaction, skills, MCP connections and hooks', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage('workflow');

    const subagents = panelByTitle(app, selectors, 'Subagents');
    for (const [agent, runs] of Object.entries(WORKFLOW.subagents.runs)) {
      await expect(subagents.getByRole('row').filter({ hasText: agent })).toContainText(String(runs));
    }
    await expect(panelByTitle(app, selectors, 'Compactions')).toContainText(String(WORKFLOW.compactions));
    await expect(panelByTitle(app, selectors, 'Auto Compactions')).toContainText(`${WORKFLOW.autoShare}%`);
    for (const skill of Object.keys(WORKFLOW.skills)) {
      await expect(legendItem(app, selectors, 'Skill Activations', skill)).toBeVisible();
    }
    for (const trigger of Object.keys(WORKFLOW.skillTriggers)) {
      await expect(legendItem(app, selectors, 'Skills by Trigger', trigger)).toBeVisible();
    }
    for (const status of Object.keys(WORKFLOW.mcpConnections)) {
      await expect(legendItem(app, selectors, 'MCP Server Connections', status)).toBeVisible();
    }
    for (const code of Object.keys(WORKFLOW.mcpFailures)) {
      await expect(legendItem(app, selectors, 'MCP Connection Failures', code)).toBeVisible();
    }
    const hooks = panelByTitle(app, selectors, 'Hooks');
    for (const [hook, runs] of Object.entries(WORKFLOW.hooks.runs)) {
      await expect(hooks.getByRole('row').filter({ hasText: hook })).toContainText(String(runs));
    }
  });
});
