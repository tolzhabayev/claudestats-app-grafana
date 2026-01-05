import React, { useEffect, useState } from 'react';
import {
  SceneApp,
  SceneAppPage,
  SceneTimeRange,
  useSceneApp,
} from '@grafana/scenes';
import { LoadingPlaceholder } from '@grafana/ui';
import { PLUGIN_BASE_URL, ROUTES } from '../../constants';
import { getSharedVariables } from '../../scenes/variables';
import { getOverviewScene } from '../../scenes/pages/OverviewScene';
import { getCostsScene } from '../../scenes/pages/CostsScene';
import { getTokensScene } from '../../scenes/pages/TokensScene';
import { getToolsScene } from '../../scenes/pages/ToolsScene';
import { getProductivityScene } from '../../scenes/pages/ProductivityScene';
import { loadTeamMembers, discoverTeamMemberUuids } from '../../utils/teamMembers';

// Helper to prefix route with plugin base URL
function prefixRoute(route: string): string {
  return `${PLUGIN_BASE_URL}/${route}`;
}

// Create individual page factories following the logs-drilldown pattern
function makeOverviewPage(
  timeRange: SceneTimeRange,
  variables: ReturnType<typeof getSharedVariables>,
  teamMembers: Record<string, string>
) {
  return new SceneAppPage({
    title: 'Claude Code Stats',
    subTitle: 'Team usage analytics for Claude Code',
    url: PLUGIN_BASE_URL,
    routePath: '/',
    getScene: () => getOverviewScene(timeRange, variables, teamMembers),
    tabs: [],
  });
}

function makeCostsPage(
  timeRange: SceneTimeRange,
  variables: ReturnType<typeof getSharedVariables>,
  teamMembers: Record<string, string>
) {
  return new SceneAppPage({
    title: 'Claude Code Stats - Costs',
    subTitle: 'Cost breakdown and trends',
    url: prefixRoute(ROUTES.Costs),
    routePath: `/${ROUTES.Costs}`,
    getScene: () => getCostsScene(timeRange, variables, teamMembers),
    tabs: [],
  });
}

function makeTokensPage(
  timeRange: SceneTimeRange,
  variables: ReturnType<typeof getSharedVariables>,
  teamMembers: Record<string, string>
) {
  return new SceneAppPage({
    title: 'Claude Code Stats - Tokens',
    subTitle: 'Token usage analytics',
    url: prefixRoute(ROUTES.Tokens),
    routePath: `/${ROUTES.Tokens}`,
    getScene: () => getTokensScene(timeRange, variables, teamMembers),
    tabs: [],
  });
}

function makeToolsPage(
  timeRange: SceneTimeRange,
  variables: ReturnType<typeof getSharedVariables>,
  teamMembers: Record<string, string>
) {
  return new SceneAppPage({
    title: 'Claude Code Stats - Tools',
    subTitle: 'Tool usage and acceptance rates',
    url: prefixRoute(ROUTES.Tools),
    routePath: `/${ROUTES.Tools}`,
    getScene: () => getToolsScene(timeRange, variables, teamMembers),
    tabs: [],
  });
}

function makeProductivityPage(
  timeRange: SceneTimeRange,
  variables: ReturnType<typeof getSharedVariables>,
  teamMembers: Record<string, string>
) {
  return new SceneAppPage({
    title: 'Claude Code Stats - Productivity',
    subTitle: 'Development productivity metrics',
    url: prefixRoute(ROUTES.Productivity),
    routePath: `/${ROUTES.Productivity}`,
    getScene: () => getProductivityScene(timeRange, variables, teamMembers),
    tabs: [],
  });
}

function getSceneApp(teamMembers: Record<string, string>, discoveredUuids: string[]) {
  const timeRange = new SceneTimeRange({ from: 'now-3h', to: 'now' });
  const variables = getSharedVariables(teamMembers, discoveredUuids);

  // Create all pages
  const overviewPage = makeOverviewPage(timeRange, variables, teamMembers);
  const costsPage = makeCostsPage(timeRange, variables, teamMembers);
  const tokensPage = makeTokensPage(timeRange, variables, teamMembers);
  const toolsPage = makeToolsPage(timeRange, variables, teamMembers);
  const productivityPage = makeProductivityPage(timeRange, variables, teamMembers);

  // Create tab references for navigation (each page shows tabs to all pages)
  const createTabPages = () => [
    new SceneAppPage({
      title: 'Overview',
      url: PLUGIN_BASE_URL,
      routePath: '/',
      getScene: () => getOverviewScene(timeRange, variables, teamMembers),
    }),
    new SceneAppPage({
      title: 'Costs',
      url: prefixRoute(ROUTES.Costs),
      routePath: `/${ROUTES.Costs}`,
      getScene: () => getCostsScene(timeRange, variables, teamMembers),
    }),
    new SceneAppPage({
      title: 'Tokens',
      url: prefixRoute(ROUTES.Tokens),
      routePath: `/${ROUTES.Tokens}`,
      getScene: () => getTokensScene(timeRange, variables, teamMembers),
    }),
    new SceneAppPage({
      title: 'Tools',
      url: prefixRoute(ROUTES.Tools),
      routePath: `/${ROUTES.Tools}`,
      getScene: () => getToolsScene(timeRange, variables, teamMembers),
    }),
    new SceneAppPage({
      title: 'Productivity',
      url: prefixRoute(ROUTES.Productivity),
      routePath: `/${ROUTES.Productivity}`,
      getScene: () => getProductivityScene(timeRange, variables, teamMembers),
    }),
  ];

  // Assign tabs to each page
  overviewPage.setState({ tabs: createTabPages() });
  costsPage.setState({ tabs: createTabPages() });
  tokensPage.setState({ tabs: createTabPages() });
  toolsPage.setState({ tabs: createTabPages() });
  productivityPage.setState({ tabs: createTabPages() });

  return new SceneApp({
    pages: [overviewPage, costsPage, tokensPage, toolsPage, productivityPage],
    urlSyncOptions: {
      updateUrlOnInit: true,
      createBrowserHistorySteps: true,
    },
  });
}

interface SceneAppRendererProps {
  teamMembers: Record<string, string>;
  discoveredUuids: string[];
}

function SceneAppRenderer({ teamMembers, discoveredUuids }: SceneAppRendererProps) {
  const scene = useSceneApp(() => getSceneApp(teamMembers, discoveredUuids));
  return <scene.Component model={scene} />;
}

export function ClaudeStatsApp() {
  const [teamMembers, setTeamMembers] = useState<Record<string, string> | null>(null);
  const [discoveredUuids, setDiscoveredUuids] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadTeamMembers(), discoverTeamMemberUuids()])
      .then(([members, uuids]) => {
        setTeamMembers(members);
        setDiscoveredUuids(uuids);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || teamMembers === null || discoveredUuids === null) {
    return <LoadingPlaceholder text="Loading Claude Code Stats..." />;
  }

  return <SceneAppRenderer teamMembers={teamMembers} discoveredUuids={discoveredUuids} />;
}
