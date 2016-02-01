
/*

  Config.js

*/

var assign = require("lodash/assign"),
    Utils  = require("./utils"),
    config = require(Utils.makePathAbsolute("sneakers.config.js"));


// Things like extensions and mime types should be automated
var defaults = {
  fonts: [
    { path : "./fonts",   route : "/fonts",   ext : ["ttf", "otf", "eot", "woff", "svg"] }
  ],
  images: [
    { path : "./images",  route : "/images"  }
  ],
  scripts: [
    { path : "./scripts", route : "/scripts", ext : "js", bundleFolders : true },
  ],
  styles: [
    { path : "./styles",  route : "/styles",  ext : "css" }
  ],
  statics: [
    { path : "./vendor",  route : "/vendor" }
  ],
  views: [
    { path : "./views", route : "/", ext : "html" }
  ]
};


module.exports = function() {

  // Copy defaults and attach to globals
  config = assign(defaults, config);

  // Store global variables
  global.vars = config.globals || {};
  if (/^prod/.test(process.env.NODE_ENV))
    global.vars = assign(global.vars, config["globals:production"] || {});

  return config;

}
