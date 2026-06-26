import { test, expect } from './fixtures';
import { MEMBERS, MODELS } from './mocks/prometheus';

/** Opens a template variable's value dropdown by its label. */
function openVariable(page: import('@playwright/test').Page, label: string) {
  const variable = page.getByTestId('data-testid template variable').filter({ hasText: label });
  return variable.getByRole('combobox').click();
}

test.describe('Template variables', () => {
  test('populates the Team Member options from label_values', async ({ mockData, gotoPage, page }) => {
    await gotoPage();
    await openVariable(page, 'Team Member');

    for (const member of MEMBERS) {
      await expect(page.getByRole('option', { name: member, exact: true })).toBeVisible();
    }
  });

  test('populates the Model options from label_values', async ({ mockData, gotoPage, page }) => {
    await gotoPage();
    await openVariable(page, 'Model');

    for (const model of MODELS) {
      await expect(page.getByRole('option', { name: model, exact: true })).toBeVisible();
    }
  });

  test('selecting a team member scopes the panel queries', async ({ mockData, gotoPage, page }) => {
    const app = await gotoPage();
    const member = MEMBERS[0];

    await openVariable(page, 'Team Member');

    // Grafana regex-escapes dots inside `=~` matchers, so the email is embedded
    // as `user_email=~"timur@example\\.com"`. Match the prefix up to the first
    // dot, which still uniquely identifies the selected member.
    const prefix = member.split('.')[0];
    const scopedQuery = app.waitForQueryDataRequest((request) => {
      const body = request.postDataJSON() as { queries?: Array<{ expr?: string }> };
      return (body.queries ?? []).some((q) => (q.expr ?? '').includes(prefix));
    });

    await page.getByRole('option', { name: member, exact: true }).click();
    // Close the dropdown to apply the multi-value selection.
    await page.keyboard.press('Escape');

    await scopedQuery;
  });
});
