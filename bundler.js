
/*

  Bundler.js

*/

var utils       = require("./utils"),
    _           = require("lodash"),
    Promise     = require("bluebird"),
    path        = require("path"),
    webpack     = require("webpack"),
    readFile    = Promise.promisify(_.bind(global.fs.readFile, global.fs));


var Bundler = module.exports = function(options) {

  var self = this;

  options = options || {};
  options.compile = ("undefined" === typeof options.compile) ? true: options.compile;
  options.watch = ("undefined" === typeof options.watch) ? true: options.watch;

  // Configure
  this.config = {
    entry: options.entry,
    output: {
      path: options.path || "/scripts/",
      filename: options.filename,
    },
    module: {
      loaders: [
       { test: /.+/, loader: "superloader" }
      ]
    },
    resolve: {
      extensions: ["", ".coffee", ".js"]
    }
  };

  // Store path
  this.path = path.join(this.config.output.path, options.filename);

  // Set up bundler
  this.bundler = webpack(this.config);
  this.bundler.outputFileSystem = global.fs;

  // Bind functions
  this.get = _.bind(this.get, this);
  // Optionally compile
  if (options.compile) this.compile();

  // Set up watch (it already updates)
  if (options.watch) this.bundler.watch({}, function(err, stats) {
    global.server.reload(self.path);
  });


  return this;

}


// Modifies file
Bundler.fromFile = function(file, type) {
  file.folder = "";
  file.name = file.dir.replace(utils.makePathAbsolute(file.basePath), "").slice(1);
  return new Bundler({ entry : file.path, filename : file.name + "." + type });
}


Bundler.prototype.compile = function(next) {
  next = next || function() {};
  this.bundler.run(next);
  return this;
}

Bundler.prototype.get = function() {
  return readFile(this.path, "utf8");
}
