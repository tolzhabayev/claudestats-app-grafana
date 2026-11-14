import type { Configuration } from '@rspack/core';
import { merge } from 'rspack-merge';

import grafanaConfig, { type Env } from './.config/rspack/rspack.config.ts';

// The base configuration already loads react/jsx-runtime from Grafana (see
// .config/bundler/externals.ts), so the plugin needs no customisations yet.
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {});
};

export default config;
