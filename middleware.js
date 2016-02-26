/**

  middleware.js

  Facilitates loading of middleware.

**/

var desires,
    utils = require("./utils");


/**

  Inserts middleware from the configuration file if requested.

  @param {express} server Express-server
  @param {String} key String with the middleware

**/

module.exports = function(server, key) {

  var middleware = global.config.middleware[key] || [];

  // Handle strings (in the event of user error)
  if ("string" === typeof middleware) middleware = [middleware];

  // Iterate
  middleware.forEach(function(pkg) {

    // If module is local, simply require
    if ("." === pkg[0] || "/" === pkg[0])
      pkg = require(utils.makePathAbsolute(pkg));

    else {
      // Lazy-load desires (don't reduce load time unless we have to)
      if (!desires) desires = require("desires");
      pkg = desires(pkg);
    }

    server.use(pkg);

  });

};
