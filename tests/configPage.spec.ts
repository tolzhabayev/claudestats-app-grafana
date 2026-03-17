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

test.describe('Metric Format Selector', () => {
  test('should be visible when plugin is enabled', async ({ appConfigPage, page }) => {
    await expect(page.getByText('Metric Format')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Prometheus / OTEL Collector' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Direct OTLP' })).toBeVisible();
  });

  test('should default to Prometheus format when metricFormat is unset', async ({ appConfigPage, page }) => {
    // The provisioned apps.yaml does not set metricFormat, so the default should be prometheus
    await expect(page.getByRole('radio', { name: 'Prometheus / OTEL Collector' })).toBeChecked();
  });

  test('should save selected format and preserve existing jsonData on change', async ({ appConfigPage, page }) => {
    // Intercept the settings POST to verify payload without causing a real reload
    let savedBody: Record<string, unknown> | null = null;
    await page.route('**/api/plugins/*/settings', async (route) => {
      savedBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.getByRole('radio', { name: 'Direct OTLP' }).click();

    expect(savedBody).not.toBeNull();
    // metricFormat should be updated to 'otlp'
    expect((savedBody as Record<string, unknown>).jsonData).toMatchObject({ metricFormat: 'otlp' });
    // Existing jsonData keys (e.g. teamMembers from provisioning) must not be dropped
    expect((savedBody as Record<string, unknown>).jsonData).toMatchObject({ teamMembers: expect.any(String) });
  });
});
