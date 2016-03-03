/**

  server

  The backbone of the server module. In development, this runs proxied through
  BrowserSync server.

  @param {Object} options Options passed on to "globals"
  @param {Function} next Called when server successfully initialized

**/

var reorg = require("reorg");

module.exports = reorg(function(options, next) {

  // Globals
  require("./globals")(options);

  var path       = require("path"),
      server     = require("express")(),
      compiler   = require("./compiler"),
      middleware = require("./middleware"),
      statics    = require("./statics"),
      Utils      = require("./Utils");

  // Helper function that handles middleware and returns error if blank
  function use(library) {
    if (!library || Array.isArray(library) && !library.length)
      return new Error("No middleware added");
    server.use(library);
  }

  // Middleware injection
  use(middleware("beforeAll"));

  // Set up sensible logging defaults, etc.
  if (!Utils.isProduction()) use(require("morgan")("dev"));

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

  // Find open port
  (function findPort(retries, next) {
    server.listen(global.ports.server, next).on("error", function(err) {
      global.ports.server++;
      findPort(--retries, next);
    });
  })(10, next);

}, "object", ["function", function() {}]);
