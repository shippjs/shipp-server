
/*

  Server.js

*/

module.exports = function() {

  var PORT     = global.ports.proxy,
      path     = require("path"),
      express  = require("express"),
      server   = express(),
      cookies  = require("cookie-parser"),
      sessions = require("express-session"),
      compiler = require("./compiler"),
      statics  = require("./statics");

  // Set up sensible logging defaults, etc.
  server.use(cookies());
  server.use(sessions({ secret : "password123", resave : false, saveUninitialized : true }));

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
  iterateMiddleware(global.config.fonts, statics);
  iterateMiddleware(global.config.images, statics);
  iterateMiddleware(global.config.statics, statics);

  // We must add the data last or it overwrites other paths
  server.use(require("./data-server")());

  // Listen (we will proxy with browser sync)
  server.listen(PORT);

}
