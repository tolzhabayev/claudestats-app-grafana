const { grafanaESModules, nodeModulesToTransform } = require('./.config/jest/utils');

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(t|j|mj)sx?$': [
      '@swc/jest',
      {
        sourceMaps: true,
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: false,
            dynamicImport: true,
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/.config/jest-setup.js', '<rootDir>/src/setupTests.ts'],
  // ESM-only packages that @grafana/scenes and @grafana/ui load, plus marked.
  transformIgnorePatterns: [nodeModulesToTransform([...grafanaESModules, '@grafana', 'marked'])],
};
