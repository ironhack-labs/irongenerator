'use strict';

const ejs = require('ejs');
const fs = require('fs');
const minimatch = require('minimatch');
const mkdirp = require('mkdirp');
const path = require('path');
const { join } = path;
const sortedObject = require('sorted-object');
const { inspect } = require('util');
const rimraf = require('rimraf');
const chalk = require('chalk');

const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8);
const TEMPLATE_DIR = join(__dirname, '..', 'templates');

const launchedFromCmd = process.platform === 'win32' && process.env._ === undefined;
const deleteDirectory = directory => ![ '*', '.' ].includes(directory) && rimraf.sync(directory);
const logCreation = destination => console.log(`   ${ chalk.cyan('created') }: ${ destination }`);

const mkdir = (base, dir) => {
  const loc = join(base, dir);
  logCreation(loc + path.sep);
  mkdirp.sync(loc, MODE_0755);
};

const write = (file, str, mode) => {
  fs.writeFileSync(file, str, { mode: mode || MODE_0666 });
  logCreation(file);
};

const copyTemplate = (from, to) => write(to, fs.readFileSync(join(TEMPLATE_DIR, from), 'utf-8'));

const copyTemplateMulti = (fromDir, toDir, nameGlob = '*') => {
  fs.readdirSync(join(TEMPLATE_DIR, fromDir))
    .filter(minimatch.filter(nameGlob, { matchBase: true }))
    .forEach(name => {
      copyTemplate(join(fromDir, name), join(toDir, name));
    });
};

const loadTemplate = name => {
  const contents = fs.readFileSync(join(__dirname, '..', 'templates', (name + '.ejs')), 'utf-8');
  const locals = Object.create(null);
  const render = () => ejs.render(contents, locals, { escape: inspect });
  return { locals, render };
};

module.exports = ({
  name,
  directory,
  ...options
}) => {
  deleteDirectory(directory);

  // Package
  const packageTemplate = require(join(TEMPLATE_DIR, '/package.json'));
  const pkg = {
    name,
    ...packageTemplate,
    scripts: {
      ...packageTemplate.scripts,
      'dev:debug': `DEBUG=${ name }* npm run dev`,
      ...options.linting && {
        'lint': 'eslint .'
      }
    },
    dependencies: {
      ...packageTemplate.dependencies,
      ...options.database && {
        'mongoose': '^=5.6.13'
      }
    },
    devDependencies: {
      ...packageTemplate.devDependencies,
      ...options.linting && {
        'eslint': '^=6.3.0',
        'eslint-plugin-import': '^=2.18.2',
        'eslint-plugin-node': '^=0.0.0',
        'eslint-plugin-promise': '^=4.2.1'
      }
    }
  };

  const locals = {
    name,
    ...options
  };

  // JavaScript
  const app = loadTemplate('app.js');
  const www = loadTemplate('server.js');
  const env = loadTemplate('.env');
  
  Object.assign(app.locals, locals);
  Object.assign(www.locals, locals);
  Object.assign(env.locals, locals);

  // App name
  www.locals.name = name;

  // App modules
  app.locals.localModules = Object.create(null);
  app.locals.modules = Object.create(null);
  app.locals.mounts = [];
  app.locals.uses = [];

  app.locals.view = false;

  app.locals.modules.logger = 'morgan';
  app.locals.uses.push("logger('dev')");
  pkg.dependencies.morgan = '^1.9.1';

  app.locals.uses.push('express.json()');
  app.locals.uses.push('express.urlencoded({ extended: false })');

  app.locals.modules.cookieParser = 'cookie-parser';
  app.locals.uses.push('cookieParser()');
  pkg.dependencies['cookie-parser'] = '^1.4.4';

  app.locals.modules.serveFavicon = 'serve-favicon';
  app.locals.uses.push('serveFavicon(join(__dirname, \'public/images\', \'favicon.ico\'))');
  pkg.dependencies['serve-favicon'] = '^2.5.0';

  if (directory !== '.') mkdir(directory, '.');

  mkdir(directory, 'server');
  mkdir(directory, 'routes');

  // Static files
  app.locals.uses.push('express.static(join(__dirname, \'public\'))');
  mkdir(directory, 'public');
  mkdir(directory, 'public/images');
  
  copyTemplateMulti('public/images', join(directory, 'public/images'));
  
  // MVC Pattern App
  if (options.architecture === 'mvc') {
    mkdir(directory, 'public/scripts');
    mkdir(directory, 'public/styles');

    copyTemplateMulti('public/scripts', join(directory, 'public/scripts'));

    // Views
    mkdir(directory, 'views');

    if (options.template) {
      switch (options.template) {
        case 'hbs':
          copyTemplateMulti('views', join(directory, 'views'), '*.hbs');
          app.locals.view = { engine: 'hbs' };
          pkg.dependencies.hbs = '^4.0.4';
          break;
        case 'pug':
          copyTemplateMulti('views', join(directory, 'views'), '*.pug');
          app.locals.view = { engine: 'pug' };
          pkg.dependencies.pug = '2.0.0-beta11';
          break;
      }
    } else {
      copyTemplateMulti('views', join(directory, 'views'), '*.html');
      app.locals.view = false;
    }

    // CSS Engine support
    switch (options.style) {
      case 'scss':
        copyTemplateMulti('styles', join(directory, '/public/styles'), '*.scss');
        app.locals.modules.sassMiddleware = 'node-sass-middleware';
        app.locals.uses.push([
          'sassMiddleware({',
          'src: join(__dirname, \'public\'),',
          'dest: join(__dirname, \'public\'),',
          'outputStyle: process.env.NODE_ENV === \'development\' ? \'nested\' : \'compressed\',',
          'sourceMap: true\n})'
        ].join('\n  '));
        pkg.dependencies['node-sass-middleware'] = '0.11.0';
        break;
      default:
        copyTemplateMulti('styles', join(directory, '/public/styles'), '*.css');
        break;
    }
  }

  // Index router mount
  const routesIndex = loadTemplate('routes/index.js');
  Object.assign(routesIndex.locals, locals);
  write(join(directory, 'routes/index.js'), routesIndex.render());

  app.locals.localModules.indexRouter = './routes/index';
  app.locals.mounts.push({ path: '/', code: 'indexRouter' });
  
  // User router mount
  const routesUser = loadTemplate('routes/user.js');
  Object.assign(routesUser.locals, locals);
  write(join(directory, 'routes/user.js'), routesUser.render());
  
  app.locals.localModules.usersRouter = './routes/user';
  app.locals.mounts.push({ path: '/user', code: 'usersRouter' });

  copyTemplate('gitignore', join(directory, '.gitignore'));

  if (options.linting) {
    copyTemplate('.eslintrc.json', join(directory, '.eslintrc.json'));
    copyTemplate('.eslintignore', join(directory, '.eslintignore'));
  }

  if (options.database) {
    mkdir(directory, 'models');
    copyTemplate('database.js', join(directory, '/server/database.js'));
    copyTemplateMulti('models', join(directory, '/models'), '*.js');
  }

  if (options.api) {
    // Use API template instead of default app
  }

  // sort dependencies like npm(1)
  pkg.dependencies = sortedObject(pkg.dependencies);

  // write files
  write(join(directory, 'app.js'), app.render());
  write(join(directory, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  write(join(directory, 'server/index.js'), www.render(), MODE_0755);
  write(join(directory, '.env'), env.render());

  const prompt = launchedFromCmd ? '>' : '$';

  if (directory !== '.') {
    console.log();
    console.log(chalk.cyan('   change directory:'));
    console.log('     %s cd %s', prompt, directory);
  }

  console.log('\n', chalk.cyan('  install dependencies:'));
  console.log('     %s npm install', prompt);
  console.log('\n', chalk.cyan('  run the app:'));

  if (launchedFromCmd) {
    console.log('     %s SET DEBUG=%s:* & npm start', prompt, name);
  } else {
    console.log('     %s DEBUG=%s:* npm start', prompt, name);
  }

  console.log();
};
