import fs from 'node:fs';
import path from 'node:path';

import type { Compiler, Configuration, RspackPluginInstance } from '@rspack/core';
import { merge } from 'rspack-merge';

import grafanaConfig, { type Env } from './.config/rspack/rspack.config.ts';

// The base configuration already loads react/jsx-runtime from Grafana (see
// .config/bundler/externals.ts).

// Same files the base configuration's `output.clean.keep` keeps (backend binaries).
const KEEP = /(.*?_(amd64|arm(64)?)(.exe)?|go_plugin_build_manifest)/;

// Rspack's `output.clean` deletes the output folder itself when nothing in it matches
// `keep`, and webpack only emptied it. docker-compose.yaml bind-mounts ./dist into
// Grafana, so a new folder detaches the mount and Grafana serves an empty plugin until
// it restarts. Empty the folder before the first compile instead and keep the folder.
class EmptyOutputDirPlugin implements RspackPluginInstance {
  private done = false;

  apply(compiler: Compiler) {
    const empty = () => {
      if (this.done) {
        return;
      }
      this.done = true;
      const dir = compiler.options.output.path;
      if (!dir || !fs.existsSync(dir)) {
        return;
      }
      for (const entry of fs.readdirSync(dir)) {
        if (!KEEP.test(entry)) {
          fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        }
      }
    };
    compiler.hooks.beforeRun.tap('EmptyOutputDirPlugin', empty);
    compiler.hooks.watchRun.tap('EmptyOutputDirPlugin', empty);
  }
}

// The Rspack CLI defaults to the 'errors-warnings' stats preset, so `--json` writes
// no assets, modules or entrypoints. The Bundle Stats workflow
// (grafana/plugin-actions/bundle-size) compares exactly those, so ask for them when
// stats are written as JSON. Plain builds keep the short console output.
const writesStatsJson = process.argv.some((arg) => arg === '--json' || arg.startsWith('--json='));

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  baseConfig.output = { ...baseConfig.output, clean: false };

  return merge(
    baseConfig,
    { plugins: [new EmptyOutputDirPlugin()] },
    writesStatsJson ? { stats: { preset: 'normal', assets: true, modules: true, entrypoints: true } } : {}
  );
};

export default config;
