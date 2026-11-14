import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig, { type Env } from './.config/webpack/webpack.config';

// Grafana 12.3+ provides react/jsx-runtime to plugins, so use its React 19 copy
// instead of bundling one. See the "Fix the jsx-runtime issue" section of
// https://grafana.com/developers/plugin-tools/migration-guides/update-from-grafana-versions/migrate-12_x-to-13_x
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
  });
};

export default config;
