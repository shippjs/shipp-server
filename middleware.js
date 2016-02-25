
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
  middleware.forEach(function(library) {

    // If module is local, simply require
    if ("." === library[0] || "/" === library[0])
      library = require(utils.makePathAbsolute(library));

    else {
      // Lazy-load desires (don't reduce load time unless we have to)
      if (!desires) desires = require("desires");
      library = desires(library);
    }

    server.use(library);

  });

};
