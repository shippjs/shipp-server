
/**

  Server.js

  The backbone of the server module. In development, this runs proxied through
  BrowserSync server.

**/

module.exports = function(options) {

  // Defaults
  options = options || {};
  require("./globals")(options);

  var path     = require("path"),
      server   = require("express")(),
      compiler = require("./compiler"),
      statics  = require("./statics"),
      options,
      PORT;

  PORT = global.ports.proxy;

  // Set up sensible logging defaults, etc. These will change with production environments
  server.use(require("morgan")("dev"));
  server.use(require("cookie-parser")());
  server.use(require("express-session")({ secret : "password123", resave : false, saveUninitialized : true }));

  // Routing middleware
  for (var route in global.config.routes) {

    // Copy options and add in route
    options = Object.assign({}, global.config.routes[route]);
    options.url = route;

    switch (options.type) {
      case "scripts":
      case "styles":
      case "views":
        server.use(compiler(options));
        break;
      case "statics":
        server.use(statics(options));
        break;
      default:
        throw new Error("Unrecognized route type", options.type);
    }
  }

  // We must add the data last or it overwrites other paths
  server.use(require("./data-server")());

  // Listen (we will proxy with browser sync)
  server.listen(PORT);

}
