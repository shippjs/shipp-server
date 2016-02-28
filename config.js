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


/**

  Ensures that a config file is properly formatted. Throws errors on issues.

  @param {Object} config The configuration

**/

function validateConfig(config) {

  // Objects
  assert(Utils.isPlainObject(config), "config is not an object");
  assert(Utils.isPlainObject(config.middleware), "middleware is not an object");
  assert(Utils.isPlainObject(config.pipelines), "pipelines is not an object");
  assert(Utils.isPlainObject(config.routes), "routes is not an object");
  assert(Utils.isPlainObject(config.env), "env is not an object");

  // Arrays
  assert(Utils.isArrayOfType(config.data, "string"), "data isn't an array of strings");
  assert(Utils.isArrayOfType(config.middleware.beforeAll, "string"), "middleware.beforeAll isn't an array of strings");
  assert(Utils.isArrayOfType(config.middleware.beforeRoutes, "string"), "middleware.beforeRoutes isn't an array of strings");
  assert(Utils.isArrayOfType(config.middleware.afterRoutes, "string"), "middleware.afterRoutes isn't an array of strings");
  assert(Utils.isArrayOfType(config.middleware.errorHandler, "string"), "middleware.errorHandler isn't an array of strings");

  // Routes
  for (var route in config.routes)
    validateRoute(config.routes[route], route);

  // Environment
  for (var key in config.env)
    assert(key == key.toUpperCase(), "env variable " + key + " isn't capitalized");

}


module.exports = function() {

  var config;

  // Load config if available
  try {
    config = JSON.parse(fs.readFileSync(Utils.makePathAbsolute("sneakers.json"), "utf8"));
  } catch (err) {
    config = Object.assign({}, require("./defaults"));
  }

  // Validate
  validateConfig(config);

  // Store environment variables
  global.env = config.env;
  for (var key in global.env)
    process.env[key] = global.env[key];

  // Store global variables
  global.locals = config.locals;

  // Copy production variables over second, so as to overwrite non-production
  // when applicable
  if (Utils.isProduction())
    global.locals = Object.assign(global.locals, config["locals:production"] || {});

  return config;

};
