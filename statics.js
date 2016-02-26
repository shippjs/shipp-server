/**

  static.js

  Creates static server: see https://github.com/isaacs/st

**/

var Utils   = require("./utils"),
    st      = require("st");


module.exports = function(options) {

  // Create path relative to process
  options.path = Utils.makePathAbsolute(options.path);

  // Set up Browsersync
  (options.exts || ["*"]).forEach(function(ext) {
    Utils.watch(options.path, ext);
  });

  return st(options);

};
