import { test, expect } from './fixtures';

test.describe('Configuration Page', () => {
  test('should display plugin status', async ({ appConfigPage, page }) => {
    await expect(page.getByText('Plugin Status')).toBeVisible();
  });

  test('should show plugin enabled status when enabled', async ({ appConfigPage, page }) => {
    // Plugin should be enabled via provisioning
    await expect(page.getByText('Plugin is enabled')).toBeVisible();
  });

  test('should display configuration tabs', async ({ appConfigPage, page }) => {
    // Check all tabs are visible
    await expect(page.getByRole('tab', { name: 'Setup Guide' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Troubleshooting' })).toBeVisible();
  });

  test('should show Setup Guide content by default', async ({ appConfigPage, page }) => {
    await expect(page.getByText('Step 1: Get Grafana Cloud OTLP Credentials')).toBeVisible();
  });

  test('should navigate to Troubleshooting tab', async ({ appConfigPage, page }) => {
    await page.getByRole('tab', { name: 'Troubleshooting' }).click();
    await expect(page.getByText('No Data Appearing')).toBeVisible();
  });

  test('should have OTLP endpoint input field', async ({ appConfigPage, page }) => {
    // Input field with placeholder
    await expect(page.getByPlaceholder('https://otlp-gateway-prod-us-east-0.grafana.net/otlp')).toBeVisible();
  });

  test('should have API Token input field', async ({ appConfigPage, page }) => {
    // Input field with placeholder
    await expect(page.getByPlaceholder('Your base64-encoded token')).toBeVisible();
  });

  test('should display metrics reference in troubleshooting', async ({ appConfigPage, page }) => {
    await page.getByRole('tab', { name: 'Troubleshooting' }).click();
    await expect(page.getByText('Metrics Reference')).toBeVisible();
    // Use first() to handle multiple matches in code editor
    await expect(page.getByText('claude_code_cost_usage_USD_total').first()).toBeVisible();
  });
});
