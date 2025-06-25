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
  testEnvironment: 'jsdom',
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles: [...(setupFiles || []), '<rootDir>/jest.setup.js'],
  testPathIgnorePatterns,
  transform: {
    ...transform,
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  automock: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  testRegex: 'src/.*/.*.spec.ts[x]?$',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]
};
