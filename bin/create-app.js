'use strict';

const ejs = require('ejs');
const fs = require('fs');
const minimatch = require('minimatch');
const path = require('path');
const { join } = path;
const sortedObject = require('sorted-object');
const { inspect } = require('util');
const chalk = require('chalk');
const { createDirectory, deleteDirectory, writeFile, readFile } = require('./utilities');

const TEMPLATE_DIR = join(__dirname, '..', 'templates');

const outputInstructions = ({ name, directory }) => {
  const launchedFromCmd = process.platform === 'win32' && process.env._ === undefined;
  const prompt = launchedFromCmd ? '>' : '$';

  if (directory !== '.') {
    console.log();
    console.log(chalk.cyan('   change directory:'));
    console.log('     %s cd %s', prompt, directory);
  }

  console.log('\n', chalk.cyan('  install dependencies:'));
  console.log('     %s npm install', prompt);
  console.log('\n', chalk.cyan('  run the app in development mode:'));
  console.log('     %s npm run dev', prompt);
  console.log('\n', chalk.cyan('  run the app in production mode:'));
  console.log('     %s npm start', prompt);

  console.log();
};

const copyTemplate = (from, to) => writeFile(to, readFile(TEMPLATE_DIR, from));

const copyTemplateMulti = (fromDirectory, toDirectory, nameGlob = '*') => {
  fs.readdirSync(join(TEMPLATE_DIR, fromDirectory))
    .filter(
      minimatch.filter(nameGlob, {
        matchBase: true
      })
    )
    .forEach(name => {
      copyTemplate(join(fromDirectory, name), join(toDirectory, name));
    });
};

const loadTemplate = name => {
  const contents = readFile(TEMPLATE_DIR, `${name}.ejs`);
  const locals = {};
  const render = () =>
    ejs.render(contents, locals, {
      escape: inspect
    });
  return {
    locals,
    render
  };
};

module.exports = ({ name, directory, verbose = false, ...options }) => {
  deleteDirectory(directory);

  // Package
  const packageTemplate = require(join(TEMPLATE_DIR, 'package.json'));
  const pkg = {
    name,
    ...packageTemplate,
    scripts: {
      ...packageTemplate.scripts,
      'dev:debug': `DEBUG=${name}* npm run dev`,
      ...(options.linting && {
        lint: 'eslint .'
      })
    },
    dependencies: {
      ...packageTemplate.dependencies,
      ...(options.database && {
        mongoose: '^5.6.13'
      })
    },
    devDependencies: {
      ...packageTemplate.devDependencies,
      ...(options.linting && {
        eslint: '^6.3.0',
        'eslint-plugin-import': '^2.18.2',
        'eslint-plugin-node': '^10.0.0',
        'eslint-plugin-promise': '^4.2.1',
        'eslint-config-prettier': '^6.3.0',
        'eslint-plugin-prettier': '^3.1.1',
        prettier: '^1.18.2',
        '@ironh/eslint-config': '^0.0.2'
      })
    }
  };

  const locals = {
    name,
    ...options
  };

  // JavaScript
  const app = loadTemplate('app.js');
  const server = loadTemplate('server.js');

  Object.assign(app.locals, locals);
  Object.assign(server.locals, locals);

  // App name
  server.locals.name = name;

  // App modules
  app.locals.localModules = {};
  app.locals.modules = {};
  app.locals.mounts = [];
  app.locals.uses = [];

  app.locals.view = false;

  // Logger
  app.locals.modules.logger = 'morgan';
  app.locals.uses.push("logger('dev')");
  pkg.dependencies.morgan = '^1.9.1';

  // Body Parsing
  if (options.api) {
    app.locals.uses.push('express.json()');
  } else {
    app.locals.uses.push('express.urlencoded({ extended: true })');
  }

  // Cookie Parser
  app.locals.modules.cookieParser = 'cookie-parser';
  app.locals.uses.push('cookieParser()');
  pkg.dependencies['cookie-parser'] = '^1.4.4';

  // Favicon
  app.locals.modules.serveFavicon = 'serve-favicon';
  app.locals.uses.push("serveFavicon(join(__dirname, 'public/images', 'favicon.ico'))");
  pkg.dependencies['serve-favicon'] = '^2.5.0';

  if (directory !== '.') createDirectory(directory, '.');

  // MVC Pattern App
  if (options.architecture === 'mvc') {
    createDirectory(directory, 'public/scripts');
    createDirectory(directory, 'public/styles');

    copyTemplateMulti('public/scripts', join(directory, 'public/scripts'));

    // Views
    createDirectory(directory, 'views');

    if (options.template) {
      switch (options.template) {
        case 'hbs':
          copyTemplateMulti('views', join(directory, 'views'), '*.hbs');
          app.locals.view = {
            engine: 'hbs'
          };
          pkg.dependencies.hbs = '^4.0.4';
          break;
        case 'pug':
          copyTemplateMulti('views', join(directory, 'views'), '*.pug');
          app.locals.view = {
            engine: 'pug'
          };
          pkg.dependencies.pug = '^2.0.0-beta11';
          break;
      }
    } else {
      copyTemplateMulti('views', join(directory, 'views'), '*.html');
      app.locals.view = false;
    }

    // CSS Engine support
    switch (options.style) {
      case 'scss':
        copyTemplateMulti('styles', join(directory, 'public/styles'), '*.scss');
        app.locals.modules.sassMiddleware = 'node-sass-middleware';
        app.locals.uses.push(
          [
            'sassMiddleware({',
            "src: join(__dirname, 'public'),",
            "dest: join(__dirname, 'public'),",
            "outputStyle: process.env.NODE_ENV === 'development' ? 'nested' : 'compressed',",
            'sourceMap: true\n})'
          ].join('\n  ')
        );
        pkg.dependencies['node-sass-middleware'] = '^0.11.0';
        break;
      default:
        copyTemplateMulti('styles', join(directory, 'public/styles'), '*.css');
        break;
    }

    // Static files
    app.locals.uses.push("express.static(join(__dirname, 'public'))");
    createDirectory(directory, 'public');
    createDirectory(directory, 'public/images');

    copyTemplateMulti('public/images', join(directory, 'public/images'));
  }

  createDirectory(directory, 'routes');

  // Index router mount
  const routesIndex = loadTemplate('routes/index.js');
  Object.assign(routesIndex.locals, locals);
  writeFile(join(directory, 'routes/index.js'), routesIndex.render(), { verbose });

  app.locals.localModules.indexRouter = './routes/index';
  app.locals.mounts.push({
    path: '/',
    code: 'indexRouter'
  });

  // User router mount
  const routesUser = loadTemplate('routes/user.js');
  Object.assign(routesUser.locals, locals);
  writeFile(join(directory, 'routes/user.js'), routesUser.render(), { verbose });

  app.locals.localModules.usersRouter = './routes/user';
  app.locals.mounts.push({
    path: '/user',
    code: 'usersRouter'
  });

  copyTemplate('gitignore', join(directory, '.gitignore'));

  if (options.linting) {
    copyTemplate('.eslintrc.json', join(directory, '.eslintrc.json'));
    copyTemplate('.eslintignore', join(directory, '.eslintignore'));
  }

  if (options.database) {
    createDirectory(directory, 'models');

    const userModel = loadTemplate('./models/user.js');
    Object.assign(userModel.locals, locals);
    writeFile(join(directory, 'models', 'user.js'), userModel.render(), { verbose });
  }

  if (options.api) {
    // Use API template instead of default app
  }

  // Sort dependencies in package.json
  pkg.dependencies = sortedObject(pkg.dependencies);

  // Write files
  writeFile(join(directory, 'app.js'), app.render(), { verbose });
  writeFile(join(directory, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', { verbose });
  writeFile(join(directory, 'server.js'), server.render(), { allowExecution: true, verbose });

  const env = loadTemplate('.env');
  Object.assign(env.locals, locals);
  writeFile(join(directory, '.env'), env.render(), { verbose });

  // Output instructions for usage
  if (verbose) outputInstructions({ name, directory });
};
