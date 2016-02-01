
/*

  Bundler.js

*/

var Utils       = require("./utils"),
    Promise     = require("bluebird"),
    path        = require("path"),
    webpack     = require("webpack"),
    readFile    = Promise.promisify(global.fs.readFile.bind(global.fs));


var Bundler = module.exports = function(options) {

  // Set up defaults
  options = Object.assign({ compile: true, watch : true, path : "/scripts/" }, options);

  // Configure
  this.config = {
    entry     : options.entry,
    output    : { path : options.path, filename : options.filename },
    module    : { loaders : [ { test: /.+/, loader: "superloader" } ] },
    resolve   : { extensions: ["", ".coffee", ".js"] }
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

  // Set up watch (it already updates)
  if (options.watch) this.bundler.watch({}, function(err, stats) {
    global.server.reload(this.path);
  }.bind(this));

}


// Modifies file
Bundler.fromFile = function(file, type) {
  file.folder = "";
  file.name = file.dir.replace(Utils.makePathAbsolute(file.basePath), "").slice(1);
  return new Bundler({ entry : file.path, filename : file.name + "." + type });
}


Bundler.prototype.get = function() {
  return readFile(this.path, "utf8");
}
