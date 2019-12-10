'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const { join, sep: separator } = require('path');
const rimraf = require('rimraf');
const chalk = require('chalk');

const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8);

const normalizePath = destination => destination.replace(process.cwd(), '');

const logCreation = destination => console.log(`   ${chalk.cyan('created')}: ${normalizePath(destination)}`);

const createDirectory = (base, directory) => {
  const location = join(base, directory);
  logCreation(location + separator);
  if (!fs.existsSync(location)) {
    mkdirp.sync(location, { recursive: true, mode: MODE_0755 });
  }
};
const deleteDirectory = directory => !['*', '.'].includes(directory) && rimraf.sync(directory);

const writeFile = (file, data, { allowExecution = false, verbose = false } = {}) => {
  fs.writeFileSync(file, data, { mode: allowExecution ? MODE_0755 : MODE_0666 });
  if (verbose) logCreation(file);
};

const readFile = (directory, file) => fs.readFileSync(join(directory, file), 'utf-8');
const readDirectory = directory => fs.readdirSync(directory);

module.exports = {
  createDirectory,
  readDirectory,
  deleteDirectory,
  writeFile,
  readFile,
  normalizePath
};
