#!/usr/bin/env node

'use strict';

const { resolve } = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const log = console.log;
const questions = require('./questions');
const createApplication = require('./../lib/create-app');
const { version: VERSION } = require('./../package');
const { merge } = require('lodash');

const normalizeAppName = (name) =>
  name
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase();
const indent = (string, length = 0) => string.padStart(string.length + length);
const normalizePath = (destination) => destination.replace(process.cwd(), '');

const terminate = () => {
  console.log('Terminating ironmaker');
  process.exit(0);
};

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

const outputInstructions = ({ directory }) => {
  const prompt = process.platform === 'win32' && !process.env._ ? '>' : '$';

  console.log('\n');

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

const run = async () => {
  log('\n', `${chalk.cyan('Welcome to ironmaker!')}  ${chalk.grey('v.' + VERSION)}`, '\n');

  const defaultOptions = {
    architecture: 'mvc',
    template: 'hbs',
    style: null,
    database: false,
    authentication: { enabled: false, mechanism: null },
    strict: false,
    linting: false
  };

  try {
    const answers = await inquirer.prompt(questions);
    const name = normalizeAppName(answers.name);
    const directory = resolve(process.cwd(), name);
    const options = merge({ ...defaultOptions, name, directory, verbose: true }, { ...answers });
    await createApplication(options);
    outputInstructions({ directory });
  } catch (error) {
    if (error.message === 'NO_OVERRIDE') {
      process.exit();
    } else {
      console.log('There was an error generating your app.');
      console.error(error);
      process.exit(1);
    }
  }
};

run();
