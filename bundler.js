
/*

  Bundler.js

*/

var utils       = require("./utils"),
    path        = require("path"),
    webpack     = require("webpack");


function Bundler(options) {

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


Bundler.prototype.get = function(next) {
  next = next || function() {};
  global.fs.readFile(this.path, "utf8", next);
}


module.exports = Bundler;
