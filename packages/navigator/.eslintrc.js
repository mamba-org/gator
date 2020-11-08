const eslintBase = require('../../eslint-base');

module.exports = {
  ...eslintBase,
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module'
  }
};
