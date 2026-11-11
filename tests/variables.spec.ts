import { test, expect } from './fixtures';
import { MEMBERS, MODELS } from './mocks/prometheus';

/**
 * Opens a template variable's value dropdown by its label and waits until the
 * given options are listed. Right after page load the picker can re-render
 * (dependent variables refreshing) and close itself, so the whole open-and-check
 * step is retried.
 */
async function openVariable(page: import('@playwright/test').Page, label: string, options: readonly string[]) {
  const combobox = page.getByTestId('data-testid template variable').filter({ hasText: label }).getByRole('combobox');
  await expect(async () => {
    await page.keyboard.press('Escape');
    await combobox.click();
    for (const option of options) {
      await expect(page.getByRole('option', { name: option, exact: true })).toBeVisible({ timeout: 1000 });
    }
  }).toPass();
}

test.describe('Template variables', () => {
  test('populates the Team Member options from label_values', async ({ mockData, gotoPage, page }) => {
    await gotoPage();
    await openVariable(page, 'Team Member', MEMBERS);
  });

  test('populates the Model options from label_values', async ({ mockData, gotoPage, page }) => {
    await gotoPage();
    await openVariable(page, 'Model', MODELS);
  });

  test('selecting a team member scopes the panel queries', async ({ mockData, gotoPage, page }) => {
    const app = await gotoPage();
    const member = MEMBERS[0];

    await openVariable(page, 'Team Member', [member]);

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
