import React, { useEffect, useState } from 'react';
import { AppRootProps } from '@grafana/data';
import { initPluginTranslations } from '@grafana/i18n';
import { loadResources } from '@grafana/scenes';
import { ClaudeStatsApp } from './scenes/SceneAppPage';
import { ClaudeStatsSettings } from '../types';
import pluginJson from '../plugin.json';

export function App(props: AppRootProps<ClaudeStatsSettings>) {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initPluginTranslations(pluginJson.id, [loadResources]).then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return null;
  }

  return <ClaudeStatsApp meta={props.meta} />;
}
