#!/usr/bin/env node

'use strict';

const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const log = console.log;
const questions = require('./questions');
const createApplication = require('./create-app');

const createAppName = name => name
  .replace(/[^A-Za-z0-9.-]+/g, '-')
  .replace(/^[-_.]+|-+$/g, '')
  .toLowerCase();

const terminate = () => {
  console.log('Terminating ironmaker');
  process.exit(0);
};

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
  
log(chalk.cyan('Welcome to the Ironbuddy Generator!'), '\n');

inquirer
  .prompt(questions)
  .then(async answers => {
    const name = createAppName(answers.name);
    const options = {
      name,
      directory: path.resolve(process.cwd(), name),
      ...answers
    };
    console.log('\n');
    await createApplication(options);
  })
  .catch(error => {
    if (error.message === 'NO_OVERRIDE') {
      process.exit();
    } else {
      console.log('There was an error generating your app.');
      console.error(error);
      process.exit(1);
    }
  });
