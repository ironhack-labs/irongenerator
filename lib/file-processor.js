'use strict';

// /* eslint-disable no-unused-vars */
const { join, dirname, extname, sep: separator } = require('path');
const fs = require('fs');
const util = require('util');
const ejs = require('ejs');
const minimatch = require('minimatch');
const chalk = require('chalk');
const mkdirp = require('mkdirp');
const prettier = require('prettier');
const prettierConfiguration = require('./../templates/.prettierrc');
const MODE_0666 = parseInt('0666', 8);
const MODE_0755 = parseInt('0755', 8); // Allow execution

// const rimraf = require('rimraf');
// const deleteDirectory = directory =>
// !['*', '.'].includes(directory) && rimraf.sync(directory);

const normalizePath = (destination) => destination.replace(process.cwd(), '');

class FileProcessor {
  constructor({
    verbose = false,
    templateDirectory,
    destinationDirectory,
    templateData
  } = {}) {
    this.queue = [];
    this.verbose = verbose;
    this.templateDirectory = templateDirectory;
    this.destinationDirectory = destinationDirectory;
    this.templateData = templateData;
  }

  _log(destination) {
    if (this.verbose)
      console.log(`   ${chalk.cyan('created')}: ${normalizePath(destination)}`);
  }

  async _createDirectory(directory = '.') {
    if (!fs.existsSync(directory)) {
      mkdirp.sync(directory, { recursive: true, mode: MODE_0755 });
      this._log(directory + separator);
    }
  }

  async _ensureDirectoryExists(path) {
    const directory = dirname(path);
    const exists = fs.existsSync(directory);
    if (!exists) await this._createDirectory(directory);
  }

  async _copy({ from, to }) {
    const { templateDirectory } = this;
    const fromPath = join(templateDirectory, from);
    const contents = await this.constructor._readFile(fromPath);
    await this._write({ to, contents });
  }

  async _copyMultiple({ from, to, nameGlob = '*' }) {
    const { templateDirectory } = this;
    const directoryContents = fs.readdirSync(join(templateDirectory, from));
    const files = directoryContents.filter(
      minimatch.filter(nameGlob, {
        matchBase: true
      })
    );
    for (const file of files) {
      await this._copy({
        from: join(from, file),
        to: join(to, file)
      });
    }
  }

  async _render({ template, to, data = {} }) {
    const { templateDirectory, destinationDirectory, templateData } = this;
    const locals = { ...templateData, ...data };
    const contents = await this.constructor._readFile(
      join(templateDirectory, `${template}.ejs`)
    );
    const extension = extname(template);
    let rendered = ejs.render(contents, locals, {
      escape: util.inspect,
      beautify: true
    });
    if (extension === '.js') {
      rendered = prettier.format(rendered, {
        parser: 'babel',
        ...prettierConfiguration
      });
    }
    const destination = join(destinationDirectory, to);
    await this._ensureDirectoryExists(destination);
    await this.constructor._writeFile(destination, rendered, {
      allowExecution: true
    });
    this._log(destination);
  }

  static async _readFile(path) {
    return fs.readFileSync(path, 'utf-8');
  }

  static async _writeFile(file, data, { allowExecution = false } = {}) {
    fs.writeFileSync(file, data, {
      mode: allowExecution ? MODE_0755 : MODE_0666
    });
  }

  async _write({ to, contents }) {
    const { destinationDirectory } = this;
    const destinationPath = join(destinationDirectory, to);
    await this._ensureDirectoryExists(destinationPath);
    await this.constructor._writeFile(destinationPath, contents);
    this._log(destinationPath);
  }

  copy(options = {}) {
    this.queue.push({ ...options, type: 'copy' });
  }

  copyMultiple(options = {}) {
    this.queue.push({ ...options, type: 'copyMultiple' });
  }

  render(options = {}) {
    this.queue.push({ ...options, type: 'render' });
  }

  write(options = {}) {
    this.queue.push({ ...options, type: 'write' });
  }

  async process() {
    this.queue.reverse();
    for (const item of this.queue) {
      switch (item.type) {
        case 'copy':
          await this._copy(item);
          break;
        case 'copyMultiple':
          await this._copyMultiple(item);
          break;
        case 'render':
          await this._render(item);
          break;
        case 'write':
          await this._write(item);
          break;
      }
    }
  }
}

module.exports = FileProcessor;
