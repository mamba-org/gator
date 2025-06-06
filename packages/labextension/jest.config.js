module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@jupyterlab|@jupyter)/).+\\.js$'
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$':
      '<rootDir>/../../node_modules/identity-obj-proxy',
    '\\.(gif|ttf|eot|svg)$':
      '<rootDir>/../../node_modules/@jupyterlab/testutils/lib/jest-file-mock.js'
  },
  testRegex: 'src/.*/.*\\.spec\\.tsx?$',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  automock: false,
  setupFilesAfterEnv: [
    '<rootDir>/../../node_modules/@jupyterlab/testutils/lib/jest-setup-test-file.js'
  ]
};
