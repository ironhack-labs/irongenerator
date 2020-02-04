'use strict';

const { join } = require('path');
const sortedObject = require('sorted-object');
const chalk = require('chalk');
const FileProcessor = require('./file-processor');

const indent = (string, length = 0) => string.padStart(string.length + length);
const normalizePath = destination => destination.replace(process.cwd(), '');

const TEMPLATE_DIR = join(__dirname, '..', 'templates');

const outputInstructions = ({ directory }) => {
  const prompt = process.platform === 'win32' && !process.env._ ? '>' : '$';

  if (directory !== '.') {
    console.log();
    console.log(chalk.cyan(indent('change directory:', 3)));
    console.log(indent(`${prompt} cd ${normalizePath(directory)}`, 5));
  }

  console.log('\n', chalk.cyan(indent('install dependencies:', 3)));
  console.log(indent(`${prompt} npm install`, 5));
  console.log('\n', chalk.cyan(indent('run the app in development mode:', 3)));
  console.log(indent(`${prompt} npm run dev`, 5));
  console.log('\n', chalk.cyan(indent('run the app in production mode:', 3)));
  console.log(indent(`${prompt} npm start`, 5));
  console.log();
};

module.exports = async ({ name, directory, verbose = false, ...options }) => {
  const locals = {
    name,
    ...options
  };

  const fileProcessor = new FileProcessor({
    verbose: true,
    templateDirectory: TEMPLATE_DIR,
    destinationDirectory: directory,
    templateData: locals
  });

  // Package
  const packageTemplate = require(join(TEMPLATE_DIR, 'package.json'));
  const packageContents = {
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

  // JavaScript
  const serverLocals = {
    name
  };
  const appLocals = {
    localModules: {},
    modules: {},
    mounts: [],
    uses: [],
    view: false,
    routers: []
  };

  // Favicon
  appLocals.modules.serveFavicon = 'serve-favicon';
  appLocals.uses.push("serveFavicon(join(__dirname, 'public/images', 'favicon.ico'))");
  packageContents.dependencies['serve-favicon'] = '^2.5.0';

  await fileProcessor._ensureDirectoryExists('.');

  // MVC Pattern App
  if (options.architecture === 'mvc') {
    fileProcessor.copyMultiple({
      from: 'public/scripts',
      to: 'public/scripts'
    });

    // Views
    if (options.template) {
      switch (options.template) {
        case 'hbs':
          fileProcessor.copyMultiple({
            from: 'views',
            to: 'views',
            nameGlob: '*.hbs'
          });
          appLocals.view = {
            engine: 'hbs'
          };
          packageContents.dependencies.hbs = '^4.0.4';
          fileProcessor.render({
            template: 'views/layout.hbs',
            to: 'views/layout.hbs'
          });
          break;
        case 'pug':
          fileProcessor.copyMultiple({
            from: 'views',
            to: 'views',
            nameGlob: '*.pug'
          });
          appLocals.view = {
            engine: 'pug'
          };
          packageContents.dependencies.pug = '^2.0.0-beta11';
          break;
      }
    } else {
      fileProcessor.copyMultiple({
        from: 'views',
        to: 'views',
        nameGlob: '*.html'
      });
      appLocals.view = false;
    }

    // CSS Engine support
    switch (options.style) {
      case 'scss':
        fileProcessor.copyMultiple({
          from: 'styles',
          to: 'public/styles',
          nameGlob: '*.scss'
        });
        appLocals.modules.sassMiddleware = 'node-sass-middleware';
        appLocals.uses.push(`
          sassMiddleware({
            src: join(__dirname, 'public'),
            dest: join(__dirname, 'public'),
            outputStyle: process.env.NODE_ENV === 'development' ? 'nested' : 'compressed',
            force: process.env.NODE_ENV === 'development',
            sourceMap: true
          })
        `);
        packageContents.dependencies['node-sass-middleware'] = '^0.11.0';
        break;
      default:
        fileProcessor.copyMultiple({
          from: 'styles',
          to: 'public/styles',
          nameGlob: '*.css'
        });
        break;
    }

    // Static files
    appLocals.uses.push("express.static(join(__dirname, 'public'))");
  }

  fileProcessor.copyMultiple({ from: 'public/images', to: 'public/images' });

  // Logging
  appLocals.modules.logger = 'morgan';
  appLocals.uses.push("logger('dev')");
  packageContents.dependencies.morgan = '^1.9.1';

  // Body Parsing
  if (options.architecture === 'api') {
    appLocals.uses.push('express.json()');
  } else {
    appLocals.uses.push('express.urlencoded({ extended: true })');
  }

  // Cookie Parsing
  if (options.authentication.enabled) {
    appLocals.modules.cookieParser = 'cookie-parser';
    appLocals.uses.push('cookieParser()');
    packageContents.dependencies['cookie-parser'] = '^1.4.4';
  }

  // Session and authentication
  if (options.authentication.enabled) {
    appLocals.modules.expressSession = 'express-session';
    packageContents.dependencies['express-session'] = '^1.17.0';
    appLocals.modules.connectMongo = 'connect-mongo';
    packageContents.dependencies['connect-mongo'] = '^3.1.2';
    appLocals.modules.mongoose = 'mongoose';
    packageContents.dependencies['bcryptjs'] = '^2.4.3';
    appLocals.uses.push(`
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
      })
    `);
  }

  // Index router mount
  fileProcessor.render({ template: 'routes/index.js', to: 'routes/index.js' });

  appLocals.routers.push({
    name: 'indexRouter',
    location: './routes/index',
    path: '/'
  });

  if (options.authentication.enabled) {
    fileProcessor.render({
      template: 'routes/authentication.js',
      to: 'routes/authentication.js'
    });

    appLocals.routers.push({
      name: 'authenticationRouter',
      location: './routes/authentication',
      path: '/authentication'
    });
  }

  if (options.authentication.enabled && !options.authentication.mechanism) {
    fileProcessor.render({
      template: 'middleware/basic-authentication-deserializer.js',
      to: 'middleware/basic-authentication-deserializer.js'
    });

    appLocals.localModules.basicAuthenticationDeserializer =
      './middleware/basic-authentication-deserializer.js';
    appLocals.uses.push(`basicAuthenticationDeserializer`);
  }

  if (options.authentication.enabled && options.authentication.mechanism === 'passport') {
    packageContents.dependencies['passport'] = '^0.4.0';
    appLocals.modules.passport = 'passport';
    appLocals.localModules.passportConfigure = './passport-configuration.js';
    appLocals.uses.push(`passport.initialize()`);
    appLocals.uses.push(`passport.session()`);

    if (options.authentication.strategies.includes('local')) {
      packageContents.dependencies['passport-local'] = '^1.0.0';
    }
    if (options.authentication.strategies.includes('github')) {
      packageContents.dependencies['passport-github'] = '^1.1.0';
    }

    fileProcessor.render({
      template: 'passport-configuration.js',
      to: 'passport-configuration.js'
    });
  }

  if (options.authentication.enabled) {
    fileProcessor.render({
      template: 'middleware/bind-user-to-view-locals.js',
      to: 'middleware/bind-user-to-view-locals.js'
    });

    fileProcessor.copy({
      from: 'middleware/route-guard.js',
      to: 'middleware/route-guard.js'
    });

    appLocals.localModules.bindUserToViewLocals = './middleware/bind-user-to-view-locals.js';
    appLocals.uses.push(`bindUserToViewLocals`);
  }

  fileProcessor.copy({ from: 'gitignore', to: '.gitignore' });

  if (options.linting) {
    Object.assign(packageContents.devDependencies, {
      eslint: '^6.3.0',
      'eslint-plugin-import': '^2.18.2',
      'eslint-plugin-node': '^10.0.0',
      'eslint-plugin-promise': '^4.2.1',
      'eslint-config-prettier': '^6.3.0',
      'eslint-plugin-prettier': '^3.1.1',
      prettier: '^1.18.2',
      '@ironh/eslint-config': '^0.0.2'
    });
    fileProcessor.copy({ from: '.eslintrc.json', to: '.eslintrc.json' });
    fileProcessor.copy({ from: '.eslintignore', to: '.eslintignore' });
  }

  if (options.database) {
    fileProcessor.render({ template: 'models/user.js', to: 'models/user.js' });
  }

  if (options.architecture === 'api') {
    // Use API template instead of default app
  }

  // Sort dependencies in package.json
  packageContents.dependencies = sortedObject(packageContents.dependencies);

  // Write files
  fileProcessor.write({
    to: 'package.json',
    contents: JSON.stringify(packageContents, null, 2) + '\n'
  });
  fileProcessor.render({ template: 'app.js', to: 'app.js', data: appLocals });
  fileProcessor.render({
    template: 'server.js',
    to: 'server.js',
    data: serverLocals
  });
  fileProcessor.render({ template: '.env', to: '.env' });

  // Process
  await fileProcessor.process();

  // Output instructions for usage
  if (verbose) outputInstructions({ name, directory });
};
