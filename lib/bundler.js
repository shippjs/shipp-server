/**

  bundler.js

  Wrapper for module bundling: currently uses webpack.

  Statics
  • fromFile

  Instance
  • constructor
  • get

**/


//
//  Dependencies
//

var Utils        = require("./utils"),
    path         = require("path"),
    webpack      = require("webpack"),
    readFile     = require("bluebird").promisify(global.shipp.fs.readFile.bind(global.shipp.fs));



/**

  Wraps a webpack instance, writing to in-memory file system.

  options
  • <String>  entry              : input file
  • <String>  filename           : output filename
  • <Boolean> [compile=true]     : compile upon instantiation
  • <Boolean> [watch=true]       : watch for recompilation
  • <String>  [path="/scripts"]  : in-memory path

  @param {Object} options
  @returns {Bundler} Instance of this class

**/

var Bundler = module.exports = function(options) {

  // Determine which extensions to look for. Our extensions come without the
  // preceeding "." that webpack needs: make sure to add them
  var self   = this,
      loader = require.resolve("superloader"),
      exts   = Utils.uniqueExtensions(path.join(options.entry, ".."))
                  .map(function(x) { return "." + x; })
                  .concat([""]);

  // Set up defaults
  options = Object.assign({ compile: true, watch : !Utils.isProduction(), path : "/scripts/" }, options);

  // Configure webpack
  this.config = {
    entry      : options.entry,
    output     : {
      path     : options.path,
      filename : options.filename
    },
    module     : {
      loaders  : [ { test: /.+/, loader: loader } ]
    },
    resolve    : { extensions: exts }
  };

  // Store path to compiled file
  this.path = path.join(this.config.output.path, options.filename);

  // Set up bundler with in-memory file system
  this.bundler = webpack(this.config);
  this.bundler.outputFileSystem = global.shipp.fs;

  // Bind functions
  this.get = this.get.bind(this);

  // Wrap compilation in order to promisify and log bundling. We cannot use
  // "promisify" since we require the "stats" object in our error callback.
  function compile(emit) {
    self.bundler.run(function(err, stats) {
      if (err) {
        global.shipp.logger.error(err);
        global.shipp.logger.error(stats.toString({ errorDetails: true }));
        return;
      }
      global.shipp.log("Bundled", self.path);
      if (emit) global.shipp.emit("route:refresh", self.path);
    });
  }

  // Only watch directory with index file: breaks outside watchers otherwise
  if (options.watch) Utils.watch(path.dirname(options.entry), "*", { all: compile });

  // Optionally compile
  // TO DO: Address race conditions here
  if (options.compile) compile();

};



/**

  Reads the most recently compiled version of a file from in-memory file system.

  @returns {String} Compiled file.

**/

Bundler.prototype.get = function() {
  return readFile(this.path, "utf8");
};



/**

  Creates a bundler from a file, modifies file for proper routing.

  @param {File} file Modified file object, as returned by Utils#getFiles
  @param {String} type Type of the output file

**/

Bundler.fromFile = function(file, type) {
  file.folder = "";
  file.name = file.dir.replace(Utils.makePathAbsolute(file.basePath), "").slice(1);
  return new Bundler({ entry : file.path, filename : file.name + "." + type });
};
