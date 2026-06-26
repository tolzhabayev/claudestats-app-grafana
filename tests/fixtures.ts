import { AppPage, AppConfigPage, test as base } from '@grafana/plugin-e2e';
import pluginJson from '../src/plugin.json';
import { mockClaudeData } from './mocks/prometheus';

type AppTestFixture = {
  gotoPage: (path?: string) => Promise<AppPage>;
  appConfigPage: AppConfigPage;
  /**
   * Registers network mocks for all datasource traffic (panel queries and
   * template variable options). List it in a test's fixtures to make the app
   * render deterministic synthetic data. Routes are installed before the test
   * body runs, so any subsequent `gotoPage()` is intercepted.
   */
  mockData: void;
};

export const test = base.extend<AppTestFixture>({
  mockData: async ({ page }, use) => {
    await mockClaudeData(page);
    await use();
  },
  gotoPage: async ({ gotoAppPage }, use) => {
    await use((path) =>
      gotoAppPage({
        path,
        pluginId: pluginJson.id,
      })
    );
  },
  appConfigPage: async ({ gotoAppConfigPage }, use) => {
    const configPage = await gotoAppConfigPage({
      pluginId: pluginJson.id,
    });
    await use(configPage);
  },
});

export { expect } from '@grafana/plugin-e2e';
