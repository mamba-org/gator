#!/usr/bin/env node

/**
 * Cross-platform wrapper for jupyter labextension build
 * Adds current directory to PATH to use our fake jlpm
 */

const { spawn } = require('child_process');
const path = require('path');

const isDev = process.argv.includes('--dev');
const currentDir = __dirname;

// Cross-platform PATH manipulation
const pathSeparator = process.platform === 'win32' ? ';' : ':';
const newPath = currentDir + pathSeparator + process.env.PATH;

const args = ['labextension', 'build', '.'];
if (isDev) {
  args.splice(2, 0, '--development', 'True');
}

console.log('Building JupyterLab extension with fake jlpm...');

const child = spawn('jupyter', args, {
  env: { ...process.env, PATH: newPath },
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Build failed:', err);
  process.exit(1);
}); 
