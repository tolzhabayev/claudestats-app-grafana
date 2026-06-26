import type { Locator } from '@playwright/test';
import type { AppPage } from '@grafana/plugin-e2e';
import type { E2ESelectorGroups } from '@grafana/plugin-e2e';

/**
 * Locator for a whole panel (header + content) identified by its title.
 *
 * The Grafana panel-header selector only matches the header element, so we walk
 * up to the panel wrapper that contains it. That wrapper is the natural scope
 * for asserting a panel's rendered value, legend, or table cells in isolation.
 */
export function panelByTitle(appPage: AppPage, selectors: E2ESelectorGroups, title: string): Locator {
  const header = appPage.getByGrafanaSelector(selectors.components.Panels.Panel.title(title));
  return appPage.ctx.page.locator('[data-viz-panel-key]').filter({ has: header });
}

/**
 * A series label within a panel, by display name.
 *
 * Works for both legend styles the plugin uses: List-mode legends (time series,
 * some pies) render a `VizLegend series` element, while Table-mode legends
 * render the name as a table cell. Matching on the visible text covers both.
 */
export function legendItem(
  appPage: AppPage,
  selectors: E2ESelectorGroups,
  panelTitle: string,
  seriesName: string
): Locator {
  return panelByTitle(appPage, selectors, panelTitle).getByText(seriesName, { exact: true }).first();
}
