/**

  errors.js

  Provides basic and custom error pages. Note that error handling in express breaks
  if the handler is attached to a router before being used in the server. As a
  result, we require the "server" variable.

**/


//
//  Dependencies
//

var Utils = require("./utils");



//
//  Helpers
//

/**

  Checks for error-related status code.

  @param {Number} code The status code
  @returns {Boolean} Returns true if is an error code

**/

function isErrorCode(code) {
  return (code && code >= 400);
}


/**

  Default page for status code errors

  @param {Object} context Data for templating
  @returns {String} The rendered html

**/

function renderDefault(context, next) {
  var html = "<html><head><body style='font-family:arial;padding:4em 0;text-align:center;'>";
  html += "<div style='font-weight:800;font-size:5em;font-style:italic'>";
  html += context.statusCode + "</div><div>";
  html += "Our apologies but you've found an error!</div></body></html>";
  next(null, html);
}



//
//  Exports
//

module.exports = function(server, handler) {

  var routes = global.config.routes,
      render,
      views;

  // Search our views directories for a file named errors.html. Alternative
  // extensions are permitted and will inform the compiler how to compile.
  for (var route in routes) {
    if ("views" === routes[route].type) {
      views = Utils.readDirectory(routes[route].path, false);

      for (var i = 0, n = views.length; i < n; i++)
        if (/errors?/i.test(views[i].name)) {
          render = global.pipelines.compileFile.bind(global.pipelines, views[i].path);
          break;
        }

      if (render) break;
    }
  }

  // Fall back to default rendered
  render = render || renderDefault;

  // Attach 404s
  server.use(function(req, res, next) {
    if (!isErrorCode(res.statusCode)) res.status(404);
    next(new Error("Not Found"));
  });

  // Attach error and render
  server.use(function(err, req, res, next) {

    var context;

    if (err && !isErrorCode(res.statusCode)) res.statusCode = 500;

    // Our compilation engine is async...
    context = { statusCode : res.statusCode };
    render(context, function(renderError, html) {

      // Proceeds to default or user error-handling
      function done(renderError, html) {
        res.send(html);
        next(err);
      }

      // If compilation engine fails, fall back to default engine
      if (renderError) return renderDefault(context, done);
      done(null, html);

    });

  });

  // Use user-provided error handler (otherwise pass errors to express)
  if (handler) {
    if (4 !== handler.length) throw new Error("Error handler must have 4 arguments");
    server.use(handler);
  }

};
