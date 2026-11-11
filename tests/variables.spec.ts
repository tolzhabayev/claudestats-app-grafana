import { test, expect } from './fixtures';
import { MEMBERS, MODELS, QUOTED_MEMBER } from './mocks/prometheus';

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
  test('populates the Team Member options from the resolved member identities', async ({
    mockData,
    gotoPage,
    page,
  }) => {
    await gotoPage();
    // Identities containing quotes or braces are kept whole.
    await openVariable(page, 'Team Member', [...MEMBERS, QUOTED_MEMBER]);
    // Usage with no identity label has nothing to filter on, so it is not an option.
    await expect(page.getByRole('option')).toHaveCount(MEMBERS.length + 2); // + quoted member + "All"
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
    // as `user_email=~"timur@example\\.com"` (and the same for `enduser_id` and
    // `user_id`, the fallback identities). Match the prefix up to the first
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

  test('shows the Model picker only on pages whose metrics carry a model label', async ({
    mockData,
    gotoPage,
    page,
  }) => {
    const variable = (label: string) => page.getByTestId('data-testid template variable').filter({ hasText: label });

    await gotoPage('costs');
    await expect(variable('Team Member')).toBeVisible();
    await expect(variable('Model')).toBeVisible();

    for (const path of ['tools', 'productivity']) {
      await gotoPage(path);
      await expect(variable('Team Member')).toBeVisible();
      await expect(variable('Model')).toHaveCount(0);
    }
  });
});
