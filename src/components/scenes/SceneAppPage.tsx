import React from 'react';
import {
  SceneApp,
  SceneAppPage,
  SceneTimeRange,
  useSceneApp,
} from '@grafana/scenes';
import { AppPluginMeta } from '@grafana/data';
import { PLUGIN_BASE_URL, ROUTES, getMetrics } from '../../constants';
import { getSharedVariables } from '../../scenes/variables';
import { buildQueries } from '../../scenes/queries';
import { getOverviewScene } from '../../scenes/pages/OverviewScene';
import { getCostsScene } from '../../scenes/pages/CostsScene';
import { getTokensScene } from '../../scenes/pages/TokensScene';
import { getToolsScene } from '../../scenes/pages/ToolsScene';
import { getProductivityScene } from '../../scenes/pages/ProductivityScene';
import { ClaudeStatsSettings } from '../../types';

// Helper to prefix route with plugin base URL
function prefixRoute(route: string): string {
  return `${PLUGIN_BASE_URL}/${route}`;
}

function getSceneApp(meta: AppPluginMeta<ClaudeStatsSettings>) {
  const settings = (meta?.jsonData ?? {}) as ClaudeStatsSettings;
  const metrics = getMetrics(settings.metricFormat);
  const queries = buildQueries(metrics);
  const variables = getSharedVariables(metrics);

  const timeRange = new SceneTimeRange({ from: 'now-3h', to: 'now' });

  return new SceneApp({
    pages: [
      new SceneAppPage({
        title: 'Claude Code Stats',
        subTitle: 'Team usage analytics for Claude Code',
        url: PLUGIN_BASE_URL,
        routePath: '*',
        getScene: () => getOverviewScene(timeRange, variables, queries),
        tabs: [
          new SceneAppPage({
            title: 'Overview',
            url: PLUGIN_BASE_URL,
            routePath: '/',
            getScene: () => getOverviewScene(timeRange, variables, queries),
          }),
          new SceneAppPage({
            title: 'Costs',
            url: prefixRoute(ROUTES.Costs),
            routePath: `/${ROUTES.Costs}`,
            getScene: () => getCostsScene(timeRange, variables, queries),
          }),
          new SceneAppPage({
            title: 'Tokens',
            url: prefixRoute(ROUTES.Tokens),
            routePath: `/${ROUTES.Tokens}`,
            getScene: () => getTokensScene(timeRange, variables, queries),
          }),
          new SceneAppPage({
            title: 'Tools',
            url: prefixRoute(ROUTES.Tools),
            routePath: `/${ROUTES.Tools}`,
            getScene: () => getToolsScene(timeRange, variables, queries),
          }),
          new SceneAppPage({
            title: 'Productivity',
            url: prefixRoute(ROUTES.Productivity),
            routePath: `/${ROUTES.Productivity}`,
            getScene: () => getProductivityScene(timeRange, variables, queries),
          }),
        ],
      }),
    ],
    urlSyncOptions: {
      updateUrlOnInit: true,
      createBrowserHistorySteps: true,
    },
  });
}

interface Props {
  meta: AppPluginMeta<ClaudeStatsSettings>;
}

function SceneAppRenderer({ meta }: Props) {
  const scene = useSceneApp(() => getSceneApp(meta));
  return <scene.Component model={scene} />;
}

export function ClaudeStatsApp({ meta }: Props) {
  return <SceneAppRenderer meta={meta} />;
}
