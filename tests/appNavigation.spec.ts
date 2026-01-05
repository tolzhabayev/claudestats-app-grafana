import { test, expect } from './fixtures';

test.describe('App Navigation', () => {
  test('should load the app and display Overview page', async ({ gotoPage, page }) => {
    await gotoPage();
    // Use breadcrumb which is more specific
    await expect(page.getByTestId('data-testid Claude Code Stats breadcrumb')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  });

  test('should navigate to Costs tab', async ({ gotoPage, page }) => {
    await gotoPage();
    await page.getByRole('tab', { name: 'Costs' }).click();
    await expect(page).toHaveURL(/.*\/costs/);
  });

  test('should navigate to Tokens tab', async ({ gotoPage, page }) => {
    await gotoPage();
    await page.getByRole('tab', { name: 'Tokens' }).click();
    await expect(page).toHaveURL(/.*\/tokens/);
  });

  test('should navigate to Tools tab', async ({ gotoPage, page }) => {
    await gotoPage();
    await page.getByRole('tab', { name: 'Tools' }).click();
    await expect(page).toHaveURL(/.*\/tools/);
  });

  test('should navigate to Productivity tab', async ({ gotoPage, page }) => {
    await gotoPage();
    await page.getByRole('tab', { name: 'Productivity' }).click();
    await expect(page).toHaveURL(/.*\/productivity/);
  });

  test('should display time range picker', async ({ gotoPage, page }) => {
    await gotoPage();
    await expect(page.getByTestId('data-testid TimePicker Open Button')).toBeVisible();
  });
});
