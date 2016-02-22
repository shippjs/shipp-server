
/**

  Config.js

  Base configuration file for sneakers server.

**/

var Utils  = require("./utils"),
    config = require(Utils.makePathAbsolute("sneakers.config.js"));


var defaults = {

  // Fonts are treated as statics, the extensions help to keep our "watch" efficient
  fonts: [
    { path : "./fonts",   url : "/fonts",   ext : ["ttf", "otf", "eot", "woff", "svg"] }
  ],

  // Images are static too. We do not use extensions here as there are too many types of
  // images, video and audio that developers may place in this folder.
  images: [
    { path : "./images",  url : "/images"  }
  ],

  // Scripts are bundled by default, forcing directories with an "index" script to webpack
  scripts: [
    { path : "./scripts", url : "/scripts", ext : "js", bundleFolders : true },
  ],

  // Meanwhile, styles don't use bundling
  styles: [
    { path : "./styles",  url : "/styles",  ext : "css" }
  ],

  // Vendor directories may include scripts, styles and JSON. As a result, we presume
  // that these are precompiled and treat them as statics.
  statics: [
    { path : "./vendor",  url : "/vendor" }
  ],

  // Views are compiled using template engines (when appropriate), HTML otherwise
  views: [
    { path : "./views",   url : "/", ext : "html" }
  ]

};


module.exports = function() {

  // Copy defaults and attach to globals
  config = Object.assign(defaults, config);

  // Store global variables
  global.vars = config.globals || {};

  // Copy production variables over second, so as to overwrite non-production
  // when applicable
  if (Utils.isProduction())
    global.vars = Object.assign(global.vars, config["globals:production"] || {});

  return config;

}
