const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const esModules = [
  '@jupyterlab/',
  'lib0',
  'y\\-protocols',
  'y\\-websocket',
  'yjs'
].join('|');

const jlabConfig = jestJupyterLab(__dirname);

const {
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testPathIgnorePatterns,
  transform
} = jlabConfig;

module.exports = {
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testEnvironment: 'jsdom',
  testPathIgnorePatterns,
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  automock: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  testRegex: 'src/.*/.*.spec.ts[x]?$',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]
};
