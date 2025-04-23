import onlyWarn from 'eslint-plugin-only-warn';
import { config } from './base.js';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    ignores: ['.*.js', 'node_modules/', 'dist/'],
    plugins: {
      'only-warn': onlyWarn,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: true,
        },
      },
    },
  },
  {
    files: ['*.js?(x)', '*.ts?(x)'],
  },
];
