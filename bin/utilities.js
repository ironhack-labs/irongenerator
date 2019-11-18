'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const { join } = path;
const rimraf = require('rimraf');
const chalk = require('chalk');

const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8);

const logCreation = destination => console.log(`   ${chalk.cyan('created')}: ${destination}`);

const createDirectory = (base, directory) => {
  const location = join(base, directory);
  logCreation(location + path.sep);
  mkdirp.sync(location, MODE_0755);
};
const deleteDirectory = directory => !['*', '.'].includes(directory) && rimraf.sync(directory);

const writeFile = (file, data, { allowExecution = false, verbose = false } = {}) => {
  fs.writeFileSync(file, data, { mode: allowExecution ? MODE_0755 : MODE_0666 });
  if (verbose) logCreation(file);
};

const readFile = (directory, file) => fs.readFileSync(join(directory, file), 'utf-8');

module.exports = {
  createDirectory,
  deleteDirectory,
  writeFile,
  readFile
};
