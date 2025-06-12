const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const jlabConfig = jestJupyterLab(__dirname);

module.exports = {
  ...jlabConfig,
  testRegex: 'src/.*/.*.spec.ts[x]?$',
  // Transform ALL known ES modules that cause issues
  transformIgnorePatterns: [
    '/node_modules/(?!(@jupyterlab|@jupyter|@rjsf|nanoid|uuid|lit|@microsoft|exenv-es6|d3-)/)'
  ]
};
