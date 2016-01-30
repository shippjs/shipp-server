
/*

  Server.js

*/

module.exports = function() {

  var PORT     = 27182,
      path     = require("path"),
      express  = require("express"),
      server   = express(),
      cookies  = require("cookie-parser"),
      sessions = require("express-session"),
      compiled = require("./compiled"),
      statics  = require("./statics"),
      views    = require("./views");

  // Set up sensible logging defaults, etc.
  server.use(cookies());
  server.use(sessions({ secret : "password123", resave : false, saveUninitialized : true }));

  // Middleware helper
  function iterateMiddleware(arr, middleware) {
    arr.forEach(function(options) { server.use(middleware(options)); });
  }

  // Add routers
  server.use(require("./views.js")());

  // Add compiled
  iterateMiddleware(global.config.styles, compiled);
  iterateMiddleware(global.config.scripts, compiled);

  // Add statics
  iterateMiddleware(global.config.fonts, statics);
  iterateMiddleware(global.config.images, statics);
  iterateMiddleware(global.config.statics, statics);

  // We must add the data last or it overwrites other paths
  server.use(require("./data-server")());

  // Listen (we will proxy with browser sync)
  server.listen(PORT);

}
