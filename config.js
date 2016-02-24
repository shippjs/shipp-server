
/**

  Config.js

  Base configuration file for sneakers server.

**/

var fs = require("fs"),
    Utils = require("./utils"),
    defaults = require("./defaults");


module.exports = function() {

  var config;

  // Load config if available
  try {
    config = JSON.parse(fs.readFileSync(Utils.makePathAbsolute("sneakers.json"), "utf8"));
    config = Object.assign({}, defaults, config);
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
