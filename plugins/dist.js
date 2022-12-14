const path = require('path');
const fs = require('fs');

const yuzu = require('yuzu-definition-core');

const glob = require('glob');

const defaultOptions = {
  outputFolderRoot: "./_templates/",
  sources: {
    root: './_dev/_templates',
    data: './_dev/_templates/**/*.json',
    schema: './_dev/_templates/**/*.schema',
    hbs: './_dev/_templates/**/*.hbs',
    markup: './_dev/_templates/**/*.html',
    layoutsDirectory: './_dev/_templates/_layouts/',
    renderedPartialDirectories: ['./_dev/_templates/blocks/', './_dev/_templates/_dataStructures/'],
  },
  autoSchemaProperties: [{
    name: '_ref',
    schema: {
      "type": "string"
    }
  }, {
    name: '_modifiers',
    schema: {
      "type": "string"
    }
  }, {
    name: 'yuzu-path',
    schema: {
      "type": "string"
    }
  }]
}

class YuzuDist {
  constructor(options) {
    const userOptions = options || {};
    this.options = Object.assign(defaultOptions, userOptions)
  }

  isPageBlock(filePath) {
    return this.getBlockType(filePath) === 'pages';
  }

  getBlockType(filePath) {
    var type = filePath.split('/')[3];
    if (type == '_dataStructures') type = 'blocks';
    return type;
  }

  getFile(filePath) {
    return {
      contents: fs.readFileSync(filePath, 'utf8'),
      name: path.basename(filePath),
      type: this.getBlockType(filePath)
    }
  }

  addData(compilation, externals) {
    var jsonFiles = glob.sync(this.options.sources.data);

    jsonFiles.forEach((filePath) => {
      if (this.isPageBlock(filePath)) {
        const file = this.getFile(filePath);
        const data = yuzu.build.resolveDataString(file.contents, filePath, externals, []);

        const dataEmitPath = `${this.options.outputFolderRoot}/data/${path.basename(file.name)}`
        this.emitFile(dataEmitPath, JSON.stringify(data, null, 4), compilation);
      }
    });
  }

  addSchema(compilation, externals) {
    const schemaFiles = glob.sync(this.options.sources.schema);

    schemaFiles.forEach((filePath) => {
      const file = this.getFile(filePath);

      const schema = yuzu.build.resolveSchema(file.contents, externals);
      if (!this.isPageBlock(filePath) && schema.properties && schema.type == "object") {
        schema.properties['_ref'] = { "type": "string" };
        schema.properties['_modifiers'] = { "type": "array", "items": { "type": "string" } };
      }

      const schemaEmitPath = `${this.options.outputFolderRoot}/schema/${file.type}/${file.name}`;
      this.emitFile(schemaEmitPath, JSON.stringify(schema, null, 4), compilation);

      let schemaMeta = yuzu.build.resolvePaths(file.contents, externals, filePath.replace(this.options.sources.root, ''));
      const metaEmitPath = `${this.options.outputFolderRoot}/schema/${file.type}/${file.name.replace('.schema', '.meta')}`;
      this.emitFile(metaEmitPath, JSON.stringify(schemaMeta, null, 4), compilation);
    });
  }

  addHbs(compilation) {
    var hbsFiles = glob.sync(this.options.sources.hbs);

    hbsFiles.forEach((filePath) => {
      const file = this.getFile(filePath);

      const hbsEmitPath = `${this.options.outputFolderRoot}/src/${file.type}/${file.name}`;
      this.emitFile(hbsEmitPath, file.contents, compilation);
    });
  }

  addMarkup(compilation) {
    var markupFiles = glob.sync(this.options.sources.markup);

    markupFiles.forEach((filePath) => {
      const file = this.getFile(filePath);

      const markupEmitPath = `${this.options.outputFolderRoot}/markup$/${file.type}/${file.name}`;
      this.emitFile(markupEmitPath, file.contents, compilation);
    });
  }

  emitFile(filename, output, compilation) {
    compilation.assets[filename] = {
      source: function() {
        return output;
      },
      size: function() {
        return output.length;
      }
    }
  }

  apply(compiler) {
    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
    compiler.hooks.emit.tapAsync('YuzuDist', (compilation, callback) => {

      var externals = yuzu.build.setup(
        this.options.sources.renderedPartialDirectories,
        this.options.sources.layoutsDirectory,
        this.options.autoSchemaProperties);

      this.addData(compilation, externals);
      this.addSchema(compilation, externals);
      this.addHbs(compilation);
      this.addMarkup(compilation);

      callback();
    });
  }
}

module.exports = YuzuDist;
