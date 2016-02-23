
/**

  Server.js

  The backbone of the server module. In development, this runs proxied through
  BrowserSync server.

**/

module.exports = function() {

  var path     = require("path"),
      server   = require("express")(),
      compiler = require("./compiler"),
      statics  = require("./statics"),
      PORT;

  // Set up sensible logging defaults, etc. These will change with production environments
  PORT = global.ports.proxy;
  server.use(require("morgan")("dev"));
  server.use(require("cookie-parser")());
  server.use(require("express-session")({ secret : "password123", resave : false, saveUninitialized : true }));

  // Middleware helper
  function iterateMiddleware(arr, middleware) {
    arr.forEach(function(options) { server.use(middleware(options)); });
  }

  // Add routers
  iterateMiddleware(global.config.views, compiler);

  // Add compile
  iterateMiddleware(global.config.styles, compiler);
  iterateMiddleware(global.config.scripts, compiler);

  // Add statics
  iterateMiddleware(global.config.statics, statics);

  // We must add the data last or it overwrites other paths
  server.use(require("./data-server")());

  // Listen (we will proxy with browser sync)
  server.listen(PORT);

}
