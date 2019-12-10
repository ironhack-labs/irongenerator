'use strict';

const { join } = require('path');
const { inspect } = require('util');
const minimatch = require('minimatch');
const sortedObject = require('sorted-object');
const ejs = require('ejs');
const chalk = require('chalk');
const { createDirectory, deleteDirectory, readDirectory, writeFile, readFile, normalizePath } = require('./utilities');

const TEMPLATE_DIR = join(__dirname, '..', 'templates');

const outputInstructions = ({ directory }) => {
  const prompt = process.platform === 'win32' && process.env._ === undefined ? '>' : '$';

  if (directory !== '.') {
    console.log();
    console.log(chalk.cyan('   change directory:'));
    console.log('     %s cd %s', prompt, normalizePath(directory));
  }

  console.log('\n', chalk.cyan('  install dependencies:'));
  console.log('     %s npm install', prompt);
  console.log('\n', chalk.cyan('  run the app in development mode:'));
  console.log('     %s npm run dev', prompt);
  console.log('\n', chalk.cyan('  run the app in production mode:'));
  console.log('     %s npm start', prompt);

  console.log();
};

const copyTemplate = (from, to, { verbose }) => writeFile(to, readFile(TEMPLATE_DIR, from), { verbose });

const copyTemplateMulti = (fromDirectory, toDirectory, nameGlob = '*') => {
  readDirectory(join(TEMPLATE_DIR, fromDirectory))
    .filter(
      minimatch.filter(nameGlob, {
        matchBase: true
      })
    )
    .forEach(name => {
      copyTemplate(join(fromDirectory, name), join(toDirectory, name), { verbose: true });
    });
};

const loadTemplate = (name, baseLocals = {}) => {
  const contents = readFile(TEMPLATE_DIR, `${name}.ejs`);
  const locals = { ...baseLocals };
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
  // deleteDirectory(directory);

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
      ...packageTemplate.devDependencies
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
  Object.assign(app.locals, {
    localModules: {},
    modules: {},
    mounts: [],
    uses: [],
    view: false,
    routers: []
  });

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
          {
            const layoutTemplate = loadTemplate('views/layout.hbs', locals);
            writeFile(join(directory, 'views/layout.hbs'), layoutTemplate.render(), { verbose });
          }
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
        app.locals.uses.push(`sassMiddleware({
          src: join(__dirname, 'public'),
          dest: join(__dirname, 'public'),
          outputStyle: process.env.NODE_ENV === 'development' ? 'nested' : 'compressed',
          force: process.env.NODE_ENV === 'development',
          sourceMap: true
        })`);
        pkg.dependencies['node-sass-middleware'] = '^0.11.0';
        break;
      default:
        copyTemplateMulti('styles', join(directory, 'public/styles'), '*.css');
        break;
    }

    // Static files
    app.locals.uses.push("express.static(join(__dirname, 'public'))");
  }

  createDirectory(directory, 'public/images');

  copyTemplateMulti('public/images', join(directory, 'public/images'));

  // Logging
  app.locals.modules.logger = 'morgan';
  app.locals.uses.push("logger('dev')");
  pkg.dependencies.morgan = '^1.9.1';

  // Body Parsing
  if (options.architecture === 'api') {
    app.locals.uses.push('express.json()');
  } else {
    app.locals.uses.push('express.urlencoded({ extended: true })');
  }

  // Cookie Parsing
  if (options.authentication.enabled) {
    app.locals.modules.cookieParser = 'cookie-parser';
    app.locals.uses.push('cookieParser()');
    pkg.dependencies['cookie-parser'] = '^1.4.4';
  }

  createDirectory(directory, 'routes');

  // Session and authentication
  if (options.authentication.enabled) {
    app.locals.modules.expressSession = 'express-session';
    pkg.dependencies['express-session'] = '^1.17.0';
    app.locals.modules.connectMongo = 'connect-mongo';
    pkg.dependencies['connect-mongo'] = '^3.1.2';
    app.locals.modules.mongoose = 'mongoose';
    pkg.dependencies['bcryptjs'] = '^2.4.3';
    app.locals.uses.push(`
  expressSession({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 24 * 15,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    },
    store: new (connectMongo(expressSession))({
      mongooseConnection: mongoose.connection,
      ttl: 60 * 60 * 24
    })
  })`);
  }

  // Index router mount
  const routesIndex = loadTemplate('routes/index.js', locals);
  writeFile(join(directory, 'routes/index.js'), routesIndex.render(), { verbose });

  app.locals.routers.push({
    name: 'indexRouter',
    location: './routes/index',
    path: '/'
  });

  if (options.authentication.enabled) {
    const authenticationRouter = loadTemplate('routes/authentication.js', locals);
    writeFile(join(directory, 'routes/authentication.js'), authenticationRouter.render(), { verbose });

    app.locals.routers.push({
      name: 'authenticationRouter',
      location: './routes/authentication',
      path: '/authentication'
    });
  }

  if (options.authentication.enabled && !options.authentication.mechanism) {
    createDirectory(directory, 'middleware');

    const basicAuthenticationDeserializer = loadTemplate('middleware/basic-authentication-deserializer.js', locals);
    writeFile(join(directory, 'middleware/basic-authentication-deserializer.js'), basicAuthenticationDeserializer.render(), { verbose });

    app.locals.localModules.basicAuthenticationDeserializer = './middleware/basic-authentication-deserializer.js';
    app.locals.uses.push(`basicAuthenticationDeserializer`);
  }

  if (options.authentication.enabled && options.authentication.mechanism === 'passport') {
    pkg.dependencies['passport'] = '^0.4.0';
    app.locals.modules.passport = 'passport';
    app.locals.localModules.passportConfigure = './passport-configuration.js';
    app.locals.uses.push(`passport.initialize()`);
    app.locals.uses.push(`passport.session()`);

    if (options.authentication.strategies.includes('local')) {
      pkg.dependencies['passport-local'] = '^1.0.0';
    }
    if (options.authentication.strategies.includes('github')) {
      pkg.dependencies['passport-github'] = '^1.1.0';
    }
    const passportConfiguration = loadTemplate('passport-configuration.js', locals);
    writeFile(join(directory, 'passport-configuration.js'), passportConfiguration.render(), { verbose });
  }

  if (options.authentication.enabled) {
    createDirectory(directory, 'middleware');

    const bindUserToViewLocals = loadTemplate('middleware/bind-user-to-view-locals.js', locals);
    writeFile(join(directory, 'middleware/bind-user-to-view-locals.js'), bindUserToViewLocals.render(), { verbose });

    copyTemplate('middleware/route-guard.js', join(directory, 'middleware/route-guard.js'), { verbose });

    app.locals.localModules.bindUserToViewLocals = './middleware/bind-user-to-view-locals.js';
    app.locals.uses.push(`bindUserToViewLocals`);
  }

  copyTemplate('gitignore', join(directory, '.gitignore'), { verbose });

  if (options.linting) {
    Object.assign(pkg.devDependencies, {
      eslint: '^6.3.0',
      'eslint-plugin-import': '^2.18.2',
      'eslint-plugin-node': '^10.0.0',
      'eslint-plugin-promise': '^4.2.1',
      'eslint-config-prettier': '^6.3.0',
      'eslint-plugin-prettier': '^3.1.1',
      prettier: '^1.18.2',
      '@ironh/eslint-config': '^0.0.2'
    });
    copyTemplate('.eslintrc.json', join(directory, '.eslintrc.json'), { verbose });
    copyTemplate('.eslintignore', join(directory, '.eslintignore'), { verbose });
  }

  if (options.database) {
    createDirectory(directory, 'models');

    const userModel = loadTemplate('./models/user.js', locals);
    writeFile(join(directory, 'models', 'user.js'), userModel.render(), { verbose });
  }

  if (options.architecture === 'api') {
    // Use API template instead of default app
  }

  // Sort dependencies in package.json
  pkg.dependencies = sortedObject(pkg.dependencies);

  // Write files
  writeFile(join(directory, 'app.js'), app.render(), { verbose });
  writeFile(join(directory, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', { verbose });
  writeFile(join(directory, 'server.js'), server.render(), { allowExecution: true, verbose });

  const env = loadTemplate('.env', locals);
  writeFile(join(directory, '.env'), env.render(), { verbose });

  // Output instructions for usage
  if (verbose) outputInstructions({ name, directory });
};
