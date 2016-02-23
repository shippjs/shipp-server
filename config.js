
/**

  Config.js

  Base configuration file for sneakers server.

**/

var Utils = require("./utils"),
    config,
    fs;


var defaults = {

  data: [
    { path : "./data", route : "/" }
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
    { path : "./fonts",   url : "/fonts",   ext : ["ttf", "otf", "eot", "woff", "svg"] },
    { path : "./images",  url : "/images" },
    { path : "./vendor",  url : "/vendor" }
  ],

  // Views are compiled using template engines (when appropriate), HTML otherwise
  views: [
    { path : "./views",   url : "/", ext : "html" }
  ],

  pipelines: {
    html: "html",
    css: "css",
    js: "javascript"
  }

};



module.exports = function() {

  // Load config if available
  try {
    config = require(Utils.makePathAbsolute("sneakers.config.js"));
    config = Object.assign(defaults, config);
  } catch (err) {
    config = {};
  }

  // Store global variables
  global.locals = config.locals || {};

  // Copy production variables over second, so as to overwrite non-production
  // when applicable
  if (Utils.isProduction())
    global.locals = Object.assign(global.locals, config["locals:production"] || {});

  return config;

}
