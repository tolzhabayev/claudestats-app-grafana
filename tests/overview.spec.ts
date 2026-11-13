import { test, expect } from './fixtures';
import { panelByTitle, legendItem } from './mocks/panels';
import {
  ACTIVE_TIME_TYPES,
  DISPLAY,
  LEADERBOARD,
  TRENDS,
  mockEmptyPanels,
  MODELS,
  MEMBERS,
  TOKEN_TYPES,
  OS_TYPES,
  HOST_ARCHES,
  TERMINAL_TYPES,
  SERVICE_VERSIONS,
  ENTRYPOINTS,
  START_TYPES,
} from './mocks/prometheus';

const TREND_PANELS = [
  ['TotalCostChange', 'Cost'],
  ['TotalTokensChange', 'Tokens'],
  ['TotalSessionsChange', 'Sessions'],
  ['ActiveUsersChange', 'Active Users'],
] as const;

test.describe('Overview scene', () => {
  test('renders the stat row with mocked totals', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText(DISPLAY.TotalCost);
    await expect(panelByTitle(app, selectors, 'Total Tokens')).toContainText(DISPLAY.TotalTokens);
    await expect(panelByTitle(app, selectors, 'Sessions')).toContainText(DISPLAY.TotalSessions);
    await expect(panelByTitle(app, selectors, 'Active Users')).toContainText(DISPLAY.ActiveUsers);
  });

  test('shows how each total changed against the previous period', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const [refId, name] of TREND_PANELS) {
      await expect(panelByTitle(app, selectors, `${name} vs Previous Period`)).toContainText(`${TRENDS[refId]}%`);
    }
  });

  test('keeps an empty comparison in its own slot', async ({ mockData, gotoPage, page, selectors }) => {
    await mockEmptyPanels(page, ['TotalTokensChange']);
    const app = await gotoPage();

    await expect(panelByTitle(app, selectors, 'Tokens vs Previous Period')).toContainText('No previous period');
    for (const [refId, name] of TREND_PANELS.filter(([refId]) => refId !== 'TotalTokensChange')) {
      await expect(panelByTitle(app, selectors, `${name} vs Previous Period`)).toContainText(`${TRENDS[refId]}%`);
    }
  });

  test('hides the change row when there is no previous period', async ({ mockData, gotoPage, page, selectors }) => {
    await mockEmptyPanels(page, ['PreviousPeriodCost']);
    const app = await gotoPage();

    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText(DISPLAY.TotalCost);
    for (const [, name] of TREND_PANELS) {
      await expect(panelByTitle(app, selectors, `${name} vs Previous Period`)).toHaveCount(0);
    }
  });

  test('brings the change row back when a refresh finds a previous period', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    let previous = false;
    // Registered last, so it answers the check before the mocks do.
    await page.route('**/api/ds/query*', async (route) => {
      const body = route.request().postDataJSON() as { queries?: Array<{ refId?: string }> };
      if (previous || !(body.queries ?? []).some((q) => q.refId === 'PreviousPeriodCost')) {
        return route.fallback();
      }
      await route.fulfill({ json: { results: { PreviousPeriodCost: { status: 200, frames: [] } } } });
    });
    const app = await gotoPage();
    await expect(panelByTitle(app, selectors, 'Total Cost')).toContainText(DISPLAY.TotalCost);
    await expect(panelByTitle(app, selectors, 'Cost vs Previous Period')).toHaveCount(0);

    // Same mounted scene: the check keeps running while the row is hidden.
    previous = true;
    await page.getByTestId('data-testid RefreshPicker run button').click();
    for (const [refId, name] of TREND_PANELS) {
      await expect(panelByTitle(app, selectors, `${name} vs Previous Period`)).toContainText(`${TRENDS[refId]}%`);
    }
  });

  test('sizes the leaderboard to its members', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();
    const table = panelByTitle(app, selectors, 'Team Leaderboard');
    await expect(table.getByText(MEMBERS[2], { exact: true })).toBeVisible();

    // Three members need far less than the 300 px a long list gets, and every row still shows.
    await expect.poll(async () => (await table.boundingBox())?.height ?? 0).toBeLessThan(250);
    for (const member of MEMBERS) {
      await expect(table.getByText(member, { exact: true })).toBeVisible();
    }
  });

  test('shows usage by surface, with a hint when entrypoints are not sent', async ({
    mockData,
    gotoPage,
    page,
    selectors,
  }) => {
    let app = await gotoPage();
    for (const entrypoint of ENTRYPOINTS) {
      await expect(legendItem(app, selectors, 'Surface', entrypoint)).toBeVisible();
    }
    await mockEmptyPanels(page, ['UsageByEntrypoint']);
    app = await gotoPage();
    const surface = panelByTitle(app, selectors, 'Surface');
    await expect(surface).toContainText('Needs the entrypoint setting.');
    // The hint wraps inside the narrow panel instead of being cut off.
    const hint = surface.getByText('Needs the entrypoint setting.');
    expect(await hint.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('renders the efficiency ratios', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    await expect(panelByTitle(app, selectors, 'Cache Hit Rate')).toContainText(DISPLAY.CacheHitRate);
    await expect(panelByTitle(app, selectors, 'Cost per Session')).toContainText(DISPLAY.CostPerSession);
    await expect(panelByTitle(app, selectors, 'Cost per Active Hour')).toContainText(DISPLAY.CostPerActiveHour);
  });

  test('renders the team leaderboard, sorted by cost, linking each member', async ({
    mockData,
    gotoPage,
    selectors,
  }) => {
    const app = await gotoPage();
    const table = panelByTitle(app, selectors, 'Team Leaderboard');

    for (const column of [
      'Team Member',
      'Cost',
      'Tokens',
      'Sessions',
      'Added',
      'Removed',
      'Commits',
      'PRs',
      'Accept %',
    ]) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    // Highest cost first; every member's row merges all columns.
    const rows = table.getByRole('row');
    await expect(rows.nth(1)).toContainText(MEMBERS[0]);
    for (const member of MEMBERS) {
      const row = table.getByRole('row').filter({ hasText: member });
      await expect(row).toContainText(`$${LEADERBOARD.Cost[member].toFixed(2)}`);
      await expect(row).toContainText(String(LEADERBOARD.Commits[member]));
      const href = await row.getByRole('link', { name: member }).getAttribute('href');
      expect(href).toContain(`var-member=${encodeURIComponent(member)}`);
      // The other filters are kept, so following the link only changes the member.
      for (const variable of ['prometheus_ds', 'model', 'repository']) {
        expect(href).toContain(`var-${variable}=`);
      }
    }
    await expect(table).not.toContainText('Unattributed');
  });

  test('renders cost charts with model and member series', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const model of MODELS) {
      await expect(legendItem(app, selectors, 'Cost Over Time', model)).toBeVisible();
    }
    for (const member of MEMBERS) {
      await expect(legendItem(app, selectors, 'Cost by Team Member', member)).toBeVisible();
    }
  });

  test('renders token usage over time by token type', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const type of TOKEN_TYPES.slice(0, 3)) {
      await expect(legendItem(app, selectors, 'Token Usage Over Time', type)).toBeVisible();
    }
  });

  test('renders active time over time split into user and CLI', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const name of Object.values(ACTIVE_TIME_TYPES)) {
      await expect(legendItem(app, selectors, 'Active Time Over Time', name)).toBeVisible();
    }
  });

  test('renders sessions broken down by start type', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    for (const startType of START_TYPES) {
      await expect(legendItem(app, selectors, 'Sessions by Start Type', startType)).toBeVisible();
    }
  });

  test('renders the environment pie charts', async ({ mockData, gotoPage, selectors }) => {
    const app = await gotoPage();

    await expect(legendItem(app, selectors, 'OS Type', OS_TYPES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Architecture', HOST_ARCHES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Terminal', TERMINAL_TYPES[0])).toBeVisible();
    await expect(legendItem(app, selectors, 'Claude Code Version', SERVICE_VERSIONS[0])).toBeVisible();
  });
});
