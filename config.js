
/*

  Config.js

*/

var assign = require("lodash/assign"),
    Utils  = require("./utils"),
    config = require(Utils.makePathAbsolute("sneakers.config.js"));


// Things like extensions and mime types should be automated
var defaults = {
  fonts: [
    { path : "./fonts",   url : "/fonts",   ext : ["ttf", "otf", "eot", "woff", "svg"] }
  ],
  images: [
    { path : "./images",  url : "/images"  }
  ],
  scripts: [
    { path : "./scripts", url : "/scripts", ext : "js", bundleFolders : true },
    { path : "./vendor",  url : "/vendor",  ext : "js", bundleFolders : true }
  ],
  styles: [
    { path : "./styles",  url : "/styles",  ext : "css" }
  ],
  statics: []
};


module.exports = function() {

  // Copy defaults and attach to globals
  config = assign(defaults, config);

  // Store engines
  global.engines = config.engines || {};

  // Store global variables
  global.vars = config.globals || {};
  if (/^prod/.test(process.env.NODE_ENV))
    global.vars = assign(global.vars, config["globals:production"] || {});

  return config;

}
