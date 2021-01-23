'use strict';

const DEVELOPMENT_MODE = Boolean(process.env.DEVELOPMENT);

const fs = require('fs');
const path = require('path');

const checkIfDirectoryIsEmpty = async (directory) => {
  try {
    const files = await fs.promises.readdir(directory);
    return !files.length;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
};

module.exports = [
  {
    name: 'name',
    type: 'input',
    message: 'App name:',
    default: 'app',
    filter: (value) =>
      value
        .replace(/[^A-Za-z0-9.-]+/g, '-')
        .replace(/^[-_.]+|-+$|\./g, '')
        .toLowerCase(),
    validate: (value) => !!value || 'Generated app should have a name'
  },
  {
    type: 'confirm',
    name: 'override',
    default: false,
    message: "There's already a folder with that name. Should ironmaker replace it?:",
    when: async ({ name }) => {
      const empty = await checkIfDirectoryIsEmpty(path.join(process.cwd(), name));
      return !empty;
    }
  },
  {
    type: 'list',
    name: 'level',
    message: 'Level:',
    default: 0,
    choices: [
      {
        name: 'Beginner',
        value: 1
      },
      {
        name: 'Medium',
        value: 2
      },
      {
        name: 'Advanced',
        value: 3
      }
    ],
    when: async ({ override }) => {
      if (typeof override !== 'undefined' && !override) throw new Error('NO_OVERRIDE');
      return true;
    }
  },
  {
    type: 'list',
    name: 'architecture',
    message: 'Architecture:',
    choices: [
      {
        name: 'MVC Pattern',
        value: 'mvc'
      },
      {
        name: 'REST API',
        value: 'api'
      }
    ],
    default: 'mvc',
    when: async ({ level }) => level >= 3
  },
  {
    type: 'list',
    name: 'template',
    message: 'Templating Engine:',
    choices: [
      {
        name: 'Handlebars',
        value: 'hbs'
      },
      {
        name: 'Pug',
        value: 'pug'
      }
    ],
    default: 'hbs',
    when: ({ architecture, level }) => architecture === 'mvc' && level >= 2
  },
  {
    type: 'list',
    name: 'style',
    message: 'Style Preprocessor:',
    choices: [
      {
        name: 'None (static CSS)',
        value: null
      },
      {
        name: 'SCSS',
        value: 'scss'
      }
    ],
    default: ({ level }) => (level >= 2 ? 'scss' : null),
    when: ({ architecture, level }) => level === 2 || (level > 2 && architecture === 'mvc')
  },
  {
    type: 'confirm',
    name: 'bootstrap',
    message: 'Include Bootstrap styles and scripts:',
    default: true,
    when: ({ architecture }) => DEVELOPMENT_MODE && architecture === 'mvc'
  },
  {
    type: 'confirm',
    name: 'database',
    message: 'Use MongoDB:',
    default: ({ level }) => level >= 2,
    when: ({ level }) => level >= 2
  },
  {
    type: 'confirm',
    name: 'authentication.enabled',
    message: 'Include Authentication:',
    default: ({ level }) => level >= 3,
    when: ({ level, database }) => level >= 3 && database
  },
  {
    type: 'list',
    name: 'authentication.mechanism',
    message: 'Authentication Mechanism:',
    choices: [
      {
        name: 'Basic Session and Cookie',
        value: null
      },
      {
        name: 'Passport',
        value: 'passport'
      }
    ],
    default: null,
    when: ({ authentication: { enabled } = {} }) => enabled
  },
  {
    name: 'authentication.strategies',
    type: 'checkbox',
    choices: [
      {
        name: 'Local',
        value: 'local'
      },
      ...(DEVELOPMENT_MODE
        ? [
            {
              name: 'Facebook',
              value: 'facebook'
            },
            {
              name: 'Twitter',
              value: 'twitter'
            }
          ]
        : []),
      {
        name: 'GitHub',
        value: 'github'
      }
    ],
    default: ['local'],
    when: ({ authentication: { mechanism } = {} }) => mechanism === 'passport'
  },
  {
    type: 'confirm',
    name: 'strict',
    default: true,
    message: 'Enable Strict Mode:',
    when: ({ level }) => level >= 3
  },
  {
    type: 'confirm',
    name: 'linting',
    default: true,
    message: 'Lint code with ESLint:',
    when: ({ level }) => level >= 2
  }
];
