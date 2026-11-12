import React from 'react';
import { SceneApp, SceneAppPage, SceneTimeRange, useSceneApp } from '@grafana/scenes';
import { AppPluginMeta } from '@grafana/data';
import { PLUGIN_BASE_URL, ROUTES, TIME_RANGES, getMetrics } from '../../constants';
import { getSharedVariables } from '../../scenes/variables';
import { buildQueries } from '../../scenes/queries';
import { getFilterDimensions } from '../../scenes/dimensions';
import { getOverviewScene } from '../../scenes/pages/OverviewScene';
import { getCostsScene } from '../../scenes/pages/CostsScene';
import { getTokensScene } from '../../scenes/pages/TokensScene';
import { getToolsScene } from '../../scenes/pages/ToolsScene';
import { getReliabilityScene } from '../../scenes/pages/ReliabilityScene';
import { getPromptsScene } from '../../scenes/pages/PromptsScene';
import { getWorkflowScene } from '../../scenes/pages/WorkflowScene';
import { getSecurityScene } from '../../scenes/pages/SecurityScene';
import { buildLogQueries } from '../../scenes/logQueries';
import { getProductivityScene } from '../../scenes/pages/ProductivityScene';
import { ClaudeStatsSettings } from '../../types';

// Helper to prefix route with plugin base URL
function prefixRoute(route: string): string {
  return `${PLUGIN_BASE_URL}/${route}`;
}

function getSceneApp(meta: AppPluginMeta<ClaudeStatsSettings>) {
  const settings = (meta?.jsonData ?? {}) as ClaudeStatsSettings;
  const metrics = getMetrics(settings.metricFormat);
  const dimensions = getFilterDimensions(settings.customLabels);
  const queries = buildQueries(metrics, dimensions);
  const variables = getSharedVariables(metrics, dimensions);
  const logQueries = buildLogQueries(dimensions);

  const timeRange = new SceneTimeRange({ from: TIME_RANGES.LAST_7D, to: 'now' });

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
            getScene: () => getToolsScene(timeRange, variables, queries, logQueries),
          }),
          new SceneAppPage({
            title: 'Productivity',
            url: prefixRoute(ROUTES.Productivity),
            routePath: `/${ROUTES.Productivity}`,
            getScene: () => getProductivityScene(timeRange, variables, queries),
          }),
          new SceneAppPage({
            title: 'Prompts',
            url: prefixRoute(ROUTES.Prompts),
            routePath: `/${ROUTES.Prompts}`,
            getScene: () => getPromptsScene(timeRange, variables, logQueries),
          }),
          new SceneAppPage({
            title: 'Workflow',
            url: prefixRoute(ROUTES.Workflow),
            routePath: `/${ROUTES.Workflow}`,
            getScene: () => getWorkflowScene(timeRange, variables, logQueries),
          }),
          new SceneAppPage({
            title: 'Reliability',
            url: prefixRoute(ROUTES.Reliability),
            routePath: `/${ROUTES.Reliability}`,
            getScene: () => getReliabilityScene(timeRange, variables, logQueries),
          }),
          new SceneAppPage({
            title: 'Security',
            url: prefixRoute(ROUTES.Security),
            routePath: `/${ROUTES.Security}`,
            getScene: () => getSecurityScene(timeRange, variables, logQueries),
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
