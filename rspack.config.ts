import type { Configuration } from '@rspack/core';
import { merge } from 'rspack-merge';

import grafanaConfig, { type Env } from './.config/rspack/rspack.config.ts';

// The base configuration already loads react/jsx-runtime from Grafana (see
// .config/bundler/externals.ts).
//
// The Rspack CLI defaults to the 'errors-warnings' stats preset, so `--json` writes
// no assets, modules or entrypoints. The Bundle Stats workflow
// (grafana/plugin-actions/bundle-size) compares exactly those, so ask for them when
// stats are written as JSON. Plain builds keep the short console output.
const writesStatsJson = process.argv.some((arg) => arg === '--json' || arg.startsWith('--json='));

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(
    baseConfig,
    writesStatsJson ? { stats: { preset: 'normal', assets: true, modules: true, entrypoints: true } } : {}
  );
};

export default config;
