'use strict';

const { join } = require('path');
const sortedObject = require('sorted-object');
const FileProcessor = require('./file-processor');

const TEMPLATE_DIR = join(__dirname, '..', 'templates');

module.exports = async ({ name, directory, verbose = false, ...options }) => {
  const locals = {
    name,
    ...options
  };

  const fileProcessor = new FileProcessor({
    verbose,
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
        mongoose: '^6.6.5'
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
  appLocals.uses.push(
    "serveFavicon(path.join(__dirname, 'public/images', 'favicon.ico'))"
  );
  packageContents.dependencies['serve-favicon'] = '^2.5.0';

  await fileProcessor._ensureDirectoryExists('.');

  // MVC Pattern App
  if (options.architecture === 'mvc') {
    fileProcessor.copyMultiple({
      from: 'public/scripts',
      to: 'public/scripts'
    });

    // Views
    const engine = options.template;
    const engineVersions = {
      hbs: '^4.2.0',
      pug: '^2.0.0-beta11'
    };
    packageContents.dependencies[engine] = engineVersions[engine];
    fileProcessor.copyMultiple({
      from: 'views',
      to: 'views',
      nameGlob: `*.${engine}`
    });
    appLocals.view = {
      engine: engine
    };
    fileProcessor.render({
      template: `views/layout.${engine}`,
      to: `views/layout.${engine}`
    });
    if (options.authentication.enabled) {
      fileProcessor.render({
        template: `views/sign-in.${engine}`,
        to: `views/sign-in.${engine}`
      });
      fileProcessor.render({
        template: `views/sign-up.${engine}`,
        to: `views/sign-up.${engine}`
      });
    }

    // CSS Engine support
    switch (options.style) {
      case 'scss':
        appLocals.modules.sassMiddleware = 'node-sass-middleware';
        appLocals.uses.push(`
          sassMiddleware({
            src: path.join('styles'),
            dest: path.join(__dirname, 'public/styles'),
            prefix: '/styles',
            outputStyle: process.env.NODE_ENV === 'development' ? 'expanded' : 'compressed',
            force: process.env.NODE_ENV === 'development',
            sourceMap: process.env.NODE_ENV === 'development'
          })
        `);
        packageContents.dependencies['node-sass-middleware'] = '^1.0.1';
        fileProcessor.copyMultiple({
          from: 'styles',
          to: 'styles',
          nameGlob: '*.scss'
        });
        break;
      default:
        fileProcessor.copyMultiple({
          from: 'styles',
          to: 'public/styles',
          nameGlob: '*.css'
        });
        break;
    }

    // Serve static files
    appLocals.uses.push("express.static(path.join(__dirname, 'public'))");
  }

  fileProcessor.copyMultiple({
    from: 'public/images',
    to: 'public/images'
  });

  // Logging
  appLocals.modules.logger = 'morgan';
  appLocals.uses.push("logger('dev')");
  packageContents.dependencies.morgan = '^1.10.0';

  // Body Parsing
  if (options.architecture === 'api') {
    packageContents.dependencies.cors = '^2.8.5';
    appLocals.modules.cors = 'cors';
    appLocals.uses.push(`cors({
      ...process.env.CLIENT_APP_ORIGINS && { origin: process.env.CLIENT_APP_ORIGINS.split(',') },
      credentials: true
    })`);
    appLocals.uses.push('express.json()');
  } else {
    appLocals.uses.push('express.urlencoded({ extended: true })');
  }

  // Session and authentication
  if (options.authentication.enabled) {
    appLocals.modules.expressSession = 'express-session';
    packageContents.dependencies['express-session'] = '^1.17.3';
    appLocals.modules.connectMongo = 'connect-mongo';
    packageContents.dependencies['connect-mongo'] = '^4.6.0';
    packageContents.dependencies['bcryptjs'] = '^2.4.3';
    appLocals.uses.push(`
      expressSession({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: false,
        proxy: true,
        ${options.architecture === 'api' ? 'proxy: true,' : ''}
        cookie: {
          maxAge: 15 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          ${
            options.architecture === 'api'
              ? `
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : false,
            secure: process.env.NODE_ENV === 'production'
              `.trim()
              : ''
          }
        },
        store: connectMongo.create({
          mongoUrl: process.env.MONGODB_URI,
          ttl: 60 * 60
        })
      })
    `);
  }

  // Base router mount
  fileProcessor.render({
    template: 'routes/base.js',
    to: 'routes/base.js'
  });

  appLocals.routers.push({
    name: 'baseRouter',
    location: './routes/base',
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

  if (
    options.authentication.enabled &&
    options.authentication.mechanism === 'passport'
  ) {
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

    fileProcessor.render({
      template: 'middleware/route-guard.js',
      to: 'middleware/route-guard.js'
    });

    appLocals.localModules.bindUserToViewLocals =
      './middleware/bind-user-to-view-locals.js';
    appLocals.uses.push(`bindUserToViewLocals`);
  }

  fileProcessor.copy({
    from: 'gitignore',
    to: '.gitignore'
  });

  if (options.linting) {
    Object.assign(packageContents.devDependencies, {
      eslint: '^8.25.0',
      'eslint-config-prettier': '^8.5.0',
      'eslint-plugin-import': '^2.26.0',
      'eslint-plugin-node': '^11.1.0',
      'eslint-plugin-prettier': '^4.2.1',
      'eslint-plugin-promise': '^6.0.1',
      prettier: '^2.7.1'
    });
    fileProcessor.copy({
      from: '.eslintrc.json',
      to: '.eslintrc.json'
    });
    fileProcessor.copy({
      from: '.eslintignore',
      to: '.eslintignore'
    });
    fileProcessor.copy({
      from: '.prettierrc.json',
      to: '.prettierrc.json'
    });
  }

  if (options.database) {
    fileProcessor.render({ template: 'models/user.js', to: 'models/user.js' });
  }

  // Use API template instead of default app
  // if (options.architecture === 'api') {
  // }

  // Sort dependencies in package.json
  packageContents.dependencies = sortedObject(packageContents.dependencies);

  // Write files
  fileProcessor.write({
    to: 'package.json',
    contents: JSON.stringify(packageContents, null, 2) + '\n'
  });
  fileProcessor.render({
    template: 'app.js',
    to: 'app.js',
    data: appLocals
  });
  fileProcessor.render({
    template: 'server.js',
    to: 'server.js',
    data: serverLocals
  });
  fileProcessor.render({
    template: '.env',
    to: '.env'
  });

  // Process
  await fileProcessor.process();
};
