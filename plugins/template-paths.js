const path = require('path');
const yuzu = require('yuzu-definition-core');
const options = require(path.join(process.cwd(), 'yuzu.config.js'));

class YuzuTemplatePaths {

  constructor(rootPath) {
    this.rootPath = rootPath;
  }

  apply(compiler) {
    // emit is asynchronous hook, tapping into it using tapAsync, you can use tapPromise/tap(synchronous) as well
    compiler.hooks.emit.tapAsync('YuzuTemplatePaths', (compilation, callback) => {

      const dependencies = Array.from(compilation.fileDependencies).filter((item) => { 
        return item.includes(options.templatesRoot) && path.extname(item) === '.json' 
      });

      const previews = yuzu.build.getPreviews(dependencies, this.rootPath);
      const output = JSON.stringify(previews, null, 4);

      // Insert this list into the webpack build as a new file asset:
      compilation.assets[options.templatePaths] = {
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