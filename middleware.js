/**

  middleware.js

  Facilitates loading of middleware.

**/

var desires,
    utils = require("./utils");


/**

  Inserts middleware from the configuration file if requested.

  @param {String} key String with the middleware
  @returns {Router} If middleware exists returns router. Otherwise nothing.

**/


module.exports = function(key) {

  var middleware = global.config.middleware[key] || [],
      router = global.express.Router();

  // Handle strings (in the event of user error)
  if ("string" === typeof middleware) middleware = [middleware];

  // Handle missing middleware
  if (!middleware || !middleware.length) return;

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

    router.use(pkg);

  });

  return router;

};
