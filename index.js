/**

  server

  The backbone of the server module. In development, this runs proxied through
  BrowserSync server.

**/

module.exports = function(options) {

  // Defaults
  options = options || {};
  require("./globals")(options);

  var path       = require("path"),
      server     = require("express")(),
      compiler   = require("./compiler"),
      middleware = require("./middleware"),
      statics    = require("./statics"),
      PORT       = global.ports.server;

  // Helper function that handles middleware and returns error if blank
  function use(library) {
    if (!library || Array.isArray(library) && !library.length)
      return new Error("No middleware added");
    server.use(library);
  }

  // Middleware injection
  use(middleware("beforeAll"));

  // Set up sensible logging defaults, etc. These will change with production environments
  use(require("morgan")("dev"));
  use(require("cookie-parser")());
  use(require("express-session")({ secret : "password123", resave : false, saveUninitialized : true }));

  // Middleware injection
  use(middleware("beforeRoutes"));

  // Routing middleware
  for (var route in global.config.routes) {

    // Copy options and add in route
    options = Object.assign({}, global.config.routes[route]);
    options.url = route;

    switch (options.type) {
      case "scripts":
      case "styles":
      case "views":
        use(compiler(options));
        break;
      case "statics":
        use(statics(options));
        break;
      default:
        throw new Error("Unrecognized route type", options.type);
    }
  }

  // We must add the data last or it overwrites other paths
  use(require("./data-server")());

  // Middleware injection
  use(middleware("afterRoutes"));

  // Error handling: please see errors middleware for explanation of structure
  require("./errors")(server, middleware("errorHandler"));

  // Listen (we will proxy with browser sync)
  server.listen(PORT);

};
