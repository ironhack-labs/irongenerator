'use strict';

// const debug = true;
const debug = false;

const fs = require('fs');
const path = require('path');

const checkIfDirectoryIsEmpty = (directory) => new Promise((resolve, reject) => {
  fs.readdir(directory, (err, files) => {
    if (err && err.code !== 'ENOENT') return reject(err);
    resolve(!files || !files.length);
  });
});

module.exports = [
  {
    name: 'name',
    type: 'input',
    message: 'App name:',
    default: 'app',
    filter: value => {
      return value
        .replace(/[^A-Za-z0-9.-]+/g, '-')
        .replace(/^[-_.]+|-+$|\./g, '')
        .toLowerCase();
    },
    validate: value => !!value || 'Generated app should have a name'
  },
  {
    type: 'confirm',
    name: 'override',
    default: !!debug,
    message: 'There\'s already a folder with that name. Should ironmaker replace it?:',
    when: async ({ name }) => {
      const empty = await checkIfDirectoryIsEmpty(path.join(process.cwd(), name));
      return !empty;
    }
  },
  {
    type: 'list',
    name: 'architecture',
    message: 'Architecture:',
    choices: [
      { name: 'MVC Pattern', value: 'mvc' },
      { name: 'REST API', value: 'api' }
    ],
    when: async ({ override }) => {
      if (typeof override !== 'undefined' && !override) throw new Error('NO_OVERRIDE');
      return true;
    }
  },
  {
    type: 'list',
    name: 'template',
    message: 'Templating Engine:',
    choices: [
      { name: 'None (static HTML)', value: null },
      { name: 'Handlebars', value: 'hbs' },
      { name: 'Pug', value: 'pug' }
    ],
    default: 'hbs',
    when: ({ architecture }) => architecture === 'mvc'
  },
  {
    type: 'list',
    name: 'style',
    message: 'Style compiler:',
    choices: [
      { name: 'None (static CSS)', value: null },
      { name: 'SCSS', value: 'scss' }
    ],
    default: 'scss',
    when: ({ architecture }) => architecture === 'mvc'
  },
  {
    type: 'confirm',
    name: 'database',
    default: true,
    message: 'Use MongoDB:'
  },
  {
    type: 'confirm',
    name: 'linting',
    default: true,
    message: 'Lint code with ESLint:'
  }
];
