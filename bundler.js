/**

  Bundler.js

  Wrapper for module bundling: currently uses webpack.

  Statics
  • fromFile

  Instance
  • construtor
  • get

**/


//
//  Dependencies
//

var Utils        = require("./utils"),
    Promise      = require("bluebird"),
    path         = require("path"),
    webpack      = require("webpack"),
    readFile     = Promise.promisify(global.fs.readFile.bind(global.fs));



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

  // Determine which extensions to look for
  var self = this,
      exts = Utils.uniqueExtensions(path.join(options.entry, "..")).concat([""]);

  // Set up defaults
  options = Object.assign({ compile: true, watch : true, path : "/scripts/" }, options);

  // Configure
  this.config = {
    entry      : options.entry,
    output     : {
      path     : options.path,
      filename : options.filename
    },
    module     : {
      loaders  : [ { test: /.+/, loader: "superloader" } ]
    },
    resolve    : { extensions: exts }
  };

  // Store path
  this.path = path.join(this.config.output.path, options.filename);

  // Set up bundler with in-memory file sysstem
  this.bundler = webpack(this.config);
  this.bundler.outputFileSystem = global.fs;

  // Bind functions
  this.get = this.get.bind(this);
  this.compile = Promise.promisify(this.bundler.run.bind(this.bundler));

  // Optionally compile
  if (options.compile) this.compile();

  if (options.watch) {
    // Only watch directory with index file: breaks outside watchers otherwise
    global.server.watch(path.join(path.dirname(options.entry), "**", "*"), function(event, file) {
      self.compile(function(err, stats) {
        global.server.reload(self.path);
      });
    });
  }

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

  @param {File} file Modified file object, as returned by Utils#mapFiles
  @param {String} type Type of the output file

**/

Bundler.fromFile = function(file, type) {
  file.folder = "";
  file.name = file.dir.replace(Utils.makePathAbsolute(file.basePath), "").slice(1);
  return new Bundler({ entry : file.path, filename : file.name + "." + type });
};
