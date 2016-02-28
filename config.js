/**

  config.js

  Base configuration file for sneakers server. The config file is an "all-or-nothing"
  approach: we either use the defaults, or create a config file for you. This
  helps to ensure that future changes to the defaults file don't break existing
  configurations.

**/

var fs = require("fs"),
    Utils = require("./utils");


/**



**/

module.exports = function() {

  var config;

  // Load config if available
  try {
    config = JSON.parse(fs.readFileSync(Utils.makePathAbsolute("sneakers.json"), "utf8"));
  } catch (err) {
    config = Object.assign({}, require("./defaults"));
  }

  // Store global variables
  global.locals = config.locals || {};

  // Copy production variables over second, so as to overwrite non-production
  // when applicable
  if (Utils.isProduction())
    global.locals = Object.assign(global.locals, config["locals:production"] || {});

  return config;

};
