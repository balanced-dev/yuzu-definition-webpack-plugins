const path = require('path');
const fs = require('fs');

const yuzu = require('yuzu-definition-core');
const options = require(path.join(process.cwd(), 'yuzu.config.js'));

const glob = require('glob');

let sep = path.sep;

const root = `${sep}${options.templatesRoot}`;
const dataPath = `${root}${sep}data${sep}`;
const schemaMetaPath = `${root}${sep}paths${sep}`;
const schemaPath = `${root}${sep}schema${sep}`;
const templatesPath = `${root}${sep}src${sep}`
const markupPath = `${root}${sep}markup${sep}`

class YuzuDist {
  isPageBlock(filePath)
  {
    return this.getBlockType(filePath) === 'pages';
  }
  getBlockType(filePath)
  {
    var type = filePath.split('/')[3];
    if(type == '_dataStructures') type = 'blocks';
    return type;
  }
  getFile(filePath) {

    return {
      contents : fs.readFileSync(filePath, 'utf8'),
      name : path.basename(filePath),
      type : this.getBlockType(filePath)
    }

  }
  addData(compilation, externals) {

    var jsonFiles = glob.sync(options.dist.data);

    jsonFiles.forEach((filePath) => {

      if(this.isPageBlock(filePath)) {

        let file = this.getFile(filePath);

        let data = yuzu.build.resolveDataString(file.contents, filePath, externals, []);
  
        this.emitFile(`${dataPath}${path.basename(file.name)}`, JSON.stringify(data, null, 4), compilation);
      }

    });

  }
  addSchema(compilation, externals) {

    var schemaFiles = glob.sync(options.dist.schema);

    schemaFiles.forEach((filePath) => {

      let file = this.getFile(filePath);

      let schema = yuzu.build.resolveSchema(file.contents, externals);
      if(!this.isPageBlock(filePath) && schema.properties && schema.type == "object") {
          schema.properties['_ref'] = { "type": "string" };
          schema.properties['_modifiers'] = { "type": "array", "items": { "type": "string" } };
      }

      this.emitFile(`${schemaPath}${file.type}${sep}${file.name}`, JSON.stringify(schema, null, 4), compilation);

      let schemaMeta = yuzu.build.resolvePaths(file.contents, externals);
      this.emitFile(`${schemaMetaPath}${file.name}`, JSON.stringify(schemaMeta, null, 4), compilation);

    });

  }
  addHbs(compilation) {

    var hbsFiles = glob.sync(options.dist.hbs);

    hbsFiles.forEach((filePath) => {

      let file = this.getFile(filePath);

      this.emitFile(`${templatesPath}${file.type}${sep}${file.name}`, file.contents, compilation);

    });

  }  
  addMarkup(compilation) {

    var markupFiles = glob.sync(options.dist.markup);

    markupFiles.forEach((filePath) => {

      let file = this.getFile(filePath);

      this.emitFile(`${markupPath}${file.type}${sep}${file.name}`, file.contents, compilation);

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

      var externals = yuzu.build.setup(options.renderedPartialDirs, options.layoutDir, options.autoSchemaProperties);

      this.addData(compilation, externals);
      this.addSchema(compilation, externals);
      this.addHbs(compilation);
      this.addMarkup(compilation);

      callback();
    });
  }
}

module.exports = YuzuDist;