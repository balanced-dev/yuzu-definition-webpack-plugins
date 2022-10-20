const path = require('path');
const yuzu = require('yuzu-definition-core');

const defaultOptions = {
  templatesFolderName: '_templates',
  outputPath: '_client/templatePaths.json',
  rootPath: 'yuzu.html'
}

class YuzuTemplatePaths {
  constructor(options) {
    const userOptions = options || {};
    this.options = Object.assign(defaultOptions, userOptions)
  }

  apply(compiler) {
    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
    compiler.hooks.emit.tapAsync('YuzuTemplatePaths', (compilation, callback) => {

      const dependencies = Array.from(compilation.fileDependencies).filter((item) => {
        return item.includes(this.options.templatesFolderName) && path.extname(item) === '.json'
      });

      const previews = yuzu.build.getPreviews(dependencies, this.options.rootPath);
      const output = JSON.stringify(previews, null, 4);

      // Insert this list into the webpack build as a new file asset:
      compilation.assets[this.options.outputPath] = {
        source: function() {
          return output;
        },
        size: function() {
          return output.length;
        }
      };

      callback();
    });
  }
}

module.exports = YuzuTemplatePaths;
