import { test, expect } from './fixtures';
import { legendItem, panelByTitle } from './mocks/panels';
import { PROMPTS } from './mocks/prometheus';

test.describe('Prompts scene', () => {
  test('renders the totals', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('prompts');

    await expect(panelByTitle(app, selectors, 'Prompts')).toContainText(String(PROMPTS.total));
    await expect(panelByTitle(app, selectors, 'Slash Command Share')).toContainText(`${PROMPTS.commandShare}%`);
    await expect(panelByTitle(app, selectors, 'Prompts per Session')).toContainText(String(PROMPTS.perSession));
    await expect(panelByTitle(app, selectors, 'Median Prompt Length')).toContainText(`${PROMPTS.lengthP50} chars`);
  });

  test('renders prompts over time, commands and prompt length in bucket order', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage('prompts');

    for (const kind of Object.keys(PROMPTS.byKind)) {
      await expect(legendItem(app, selectors, 'Prompts Over Time', kind)).toBeVisible();
    }
    for (const command of Object.keys(PROMPTS.topCommands)) {
      await expect(legendItem(app, selectors, 'Top Slash Commands', command)).toBeVisible();
    }
    for (const source of Object.keys(PROMPTS.bySource)) {
      await expect(legendItem(app, selectors, 'Slash Commands by Source', source)).toBeVisible();
    }
    const length = panelByTitle(app, selectors, 'Prompt Length');
    await expect(length).toContainText(/Under 100.*100 to 499.*500 to 1,999.*2,000 or more/s);
  });

  test('queries user_prompt events in Loki without the Model filter', async ({ mockData, gotoPage, page }) => {
    const picker = (label: string) => page.getByTestId('data-testid template variable').filter({ hasText: label });
    const promptQuery = page.waitForRequest((request) => {
      if (!request.url().includes('/api/ds/query')) {
        return false;
      }
      const body = request.postDataJSON() as { queries?: Array<{ datasource?: { type?: string }; expr?: string }> };
      return (body.queries ?? []).some(
        (q) =>
          q.datasource?.type === 'loki' &&
          (q.expr ?? '').includes('event_name=~"user_prompt"') &&
          (q.expr ?? '').includes('user_email=~') &&
          !(q.expr ?? '').includes('model=~')
      );
    });

    await gotoPage('prompts');
    await expect(picker('Events')).toBeVisible();
    await expect(picker('Model')).toHaveCount(0);
    await promptQuery;
  });
});
