/**

  server

  The backbone of the server module. In development, this runs proxied through
  BrowserSync server.

  @param {Object} options Options passed on to "globals"
  @param {Function} next Called when server successfully initialized

**/

var http = require("http"),
    reorg = require("reorg");

module.exports = reorg(function(options, next) {

  // Globals
  require("./globals")(options);

  var server     = global.shipp.server = global.shipp.framework({ strict: true }),
      middleware = require("./middleware"),
      Utils      = require("./utils");

  // Create http server
  global.shipp.http = http.createServer(server);

  // Remove views functionality (we handle this in our compilers)
  server.disable("view cache");
  server.disable("view engine");
  server.disable("views");

  // Remove powered-by header for security
  server.disable("x-powered-by");

  // Websockets
  require('./websockets')();

  // Middleware
  [
    // User-defined middleware
    middleware("beforeAll"),

    // Common middleware: logging, favicons, cookie parsing, sessions and body parsing
    require("./common")(),

    // User-defined middleware
    middleware("beforeRoutes"),

    // Static and compiled routes
    require("./routes")(),

    // Data-server
    require("./data-api")(),

    // User-defined middleware
    middleware("afterRoutes")

  ].forEach(function(library) {
    Utils.useMiddleware(server, library);
  });

  // Error handling: please see errors middleware for explanation of structure
  require("./errors")(server, middleware("errorHandler"));

  // Find open port and set up graceful shutdown
  require("./lifecycle")(next);

}, "object", ["function", function() {}]);
