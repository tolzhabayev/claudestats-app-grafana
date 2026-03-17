import React from 'react';
import { AppRootProps } from '@grafana/data';
import { ClaudeStatsApp } from './scenes/SceneAppPage';
import { ClaudeStatsSettings } from '../types';

export function App(props: AppRootProps<ClaudeStatsSettings>) {
  return <ClaudeStatsApp meta={props.meta} />;
}
