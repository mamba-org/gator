module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@jupyterlab|lib0|y\\-protocols|y\\-websocket|yjs)/)'
  ],
  testRegex: 'src/.*/.*\\.spec\\.tsx?$',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  automock: false
};
