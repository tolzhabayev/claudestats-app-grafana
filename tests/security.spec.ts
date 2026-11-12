import { test, expect } from './fixtures';
import { legendItem, panelByTitle } from './mocks/panels';
import { SECURITY } from './mocks/prometheus';

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
});
