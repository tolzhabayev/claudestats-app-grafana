import { test, expect } from './fixtures';
import { legendItem, panelByTitle } from './mocks/panels';
import { mockEmptyPanels, SECURITY } from './mocks/prometheus';

test.describe('Security scene', () => {
  test('renders the totals', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('security');

    await expect(panelByTitle(app, selectors, 'Permission Escalations')).toContainText(String(SECURITY.escalations));
    await expect(panelByTitle(app, selectors, 'Login Failures')).toContainText(String(SECURITY.loginFailures));
    await expect(panelByTitle(app, selectors, 'Unofficial Plugin Installs')).toContainText(
      String(SECURITY.unofficialPlugins)
    );
    await expect(panelByTitle(app, selectors, 'Sessions Refused by Policy')).toContainText(
      String(SECURITY.refusedSessions)
    );
  });

  test('renders the breakdowns', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage('security');

    const breakdowns: Array<[string, Record<string, number>]> = [
      ['Escalations by Team Member', SECURITY.escalationsByMember],
      ['Permission Mode Changes', SECURITY.modeChanges],
      ['Tool Decisions by Mode', SECURITY.decisionsByMode],
      ['Auto Mode Classifier Verdicts', SECURITY.classifierVerdicts],
      ['Classifier Blocks by Rule', SECURITY.classifierBlocks],
      ['Rejected Tool Calls by Source', SECURITY.rejectionsBySource],
      ['Login Failures by Category', SECURITY.authFailures],
      ['Plugin Installs by Marketplace', SECURITY.pluginInstalls],
      ['Managed Settings Helper State', SECURITY.helperState],
    ];
    for (const [title, values] of breakdowns) {
      for (const name of Object.keys(values)) {
        await expect(legendItem(app, selectors, title, name)).toBeVisible();
      }
    }
  });

  test('queries security events in Loki with the member filter', async ({ mockData, gotoPage, page }) => {
    const query = page.waitForRequest((request) => {
      if (!request.url().includes('/api/ds/query')) {
        return false;
      }
      const body = request.postDataJSON() as { queries?: Array<{ datasource?: { type?: string }; expr?: string }> };
      return (body.queries ?? []).some(
        (q) =>
          q.datasource?.type === 'loki' &&
          (q.expr ?? '').includes('event_name=~"permission_mode_changed"') &&
          (q.expr ?? '').includes('user_email=~')
      );
    });
    await gotoPage('security');
    await query;
  });

  test('says what an empty breakdown means instead of drawing an empty bar', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    await mockEmptyPanels(page, ['EscalationsByMember', 'ClassifierBlocks', 'AuthFailuresByCategory']);
    const app = await gotoPage('security');

    for (const [title, hint] of [
      ['Escalations by Team Member', 'Nobody switched to bypassPermissions or auto mode in this period.'],
      ['Classifier Blocks by Rule', 'The classifier blocked no tool calls in this period.'],
      ['Login Failures by Category', 'No failed logins in this period.'],
    ]) {
      const panel = panelByTitle(app, selectors, title);
      await expect(panel).toContainText(hint);
      await expect(panel.getByTestId('data-testid Bar gauge value')).toHaveCount(0);
    }
    // Panels with data still draw their bars.
    await expect(
      panelByTitle(app, selectors, 'Permission Mode Changes').getByTestId('data-testid Bar gauge value').first()
    ).toBeVisible();
  });

  test('asks for the event exporter when Loki has no events at all', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    await mockEmptyPanels(page, ['AnyEvents', 'AuthFailuresByCategory']);
    const app = await gotoPage('security');

    const panel = panelByTitle(app, selectors, 'Login Failures by Category');
    await expect(panel).toContainText('Needs OTEL_LOGS_EXPORTER=otlp');
    await expect(panel).not.toContainText('No failed logins in this period.');
  });

  test('empty panels share one event check instead of each asking Loki', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    await mockEmptyPanels(page, ['EscalationsByMember', 'ClassifierBlocks', 'AuthFailuresByCategory']);
    const sent: Record<string, number> = {};
    page.on('request', (request) => {
      if (request.url().includes('/api/ds/query')) {
        const body = request.postDataJSON() as { queries?: Array<{ refId?: string }> };
        for (const { refId = '' } of body.queries ?? []) {
          sent[refId] = (sent[refId] ?? 0) + 1;
        }
      }
    });
    const app = await gotoPage('security');

    await expect(panelByTitle(app, selectors, 'Login Failures by Category')).toContainText(
      'No failed logins in this period.'
    );
    await expect(panelByTitle(app, selectors, 'Classifier Blocks by Rule')).toContainText(
      'The classifier blocked no tool calls in this period.'
    );
    // The check runs as often as one panel's own query does, not once per empty panel.
    expect(sent.AnyEvents).toBe(sent.AuthFailuresByCategory);
  });

  test('makes no claim about an empty breakdown when the event check fails', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    await mockEmptyPanels(page, ['AuthFailuresByCategory']);
    // Registered last, so it answers the event check before the mocks do.
    await page.route('**/api/ds/query*', async (route) => {
      const body = route.request().postDataJSON() as { queries?: Array<{ refId?: string }> };
      if (!(body.queries ?? []).some((q) => q.refId === 'AnyEvents')) {
        return route.fallback();
      }
      await route.fulfill({ json: { results: { AnyEvents: { status: 500, error: 'query timed out' } } } });
    });
    const app = await gotoPage('security');

    const panel = panelByTitle(app, selectors, 'Login Failures by Category');
    await expect(panel).toContainText('No data');
    await expect(panel).not.toContainText('No failed logins in this period.');
    await expect(panel).not.toContainText('Needs OTEL_LOGS_EXPORTER=otlp');
  });
});
