const eslintBase = require('./eslint-base');

eslintBase.parserOptions.project = 'tsconfig-base.json';

module.exports = eslintBase;