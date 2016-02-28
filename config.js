/**

  config.js

  Base configuration file for sneakers server. The config file is an "all-or-nothing"
  approach: we either use the defaults, or create a config file for you. This
  helps to ensure that future changes to the defaults file don't break existing
  configurations.

**/

var fs = require("fs"),
    assert = require("assert"),
    Utils = require("./utils");


/**

  Tests that a route is valid

  @param {Object} route The route to check
  @param {String} [name] Name of the route (for error handling)

**/

function validateRoute(route, name) {

  var validKeys = ["type", "path", "exts", "bundleFolders"];

  name = (name) ? "route " + name : "route";
  assert("string" === typeof route.type, name + " has invalid type")
  assert("string" === typeof route.path, name + " has invalid path")

  for (var key in route)
    assert(validKeys.indexOf(key) > -1, name + " has unrecognized key " + key);

}


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
