/**

  handler.js

  Creates and manages route handlers.

  As a note: we differentiate between "extensions" and "types". The extension
  is the actual file extension, whereas the type is the extension a file will
  be after processing.

  • createHandler
  • attachData

**/

/**

  Dependencies and exports

**/

var Utils = require("./utils");
var Cache = require("./cache");

module.exports = {
  attachData: attachData,
  createHandler: createHandler
};


/**

  Attaches cookies and session information to request and response objects.

  @param {Object} object data object
  @param {Request} req Express request
  @param {Response} res Express response

**/

function attachData(data, req, res) {

  // Set cookies
  for (var key in data.cookies || {})
    res.cookie(key, data.cookies[key]);

  // Set session
  for (key in data.session || {})
    req.session[key] = data.session[key];

}
  

/**

  Creates a route handler for a file

  @param {Renderer} renderer Renderer for the route handler
  @return {Function} Route handler of form (req, res)

**/

function createHandler(renderer) {

  global.shipp.debug("Creating handler function for " + renderer.id);

  return function(req, res, next) {

    // Parse parameters
    var params = {
      body: req.body || {},
      cookies: req.cookies,
      locals: res.locals,
      params: req.params || {},
      query: req.query || {},
      session: req.session || {}
    };

    // Special slug
    if (renderer.metadata.isTemplate)
      params.slug = req.path.replace(req.route.path.split(":")[0], "");

    // Compression method
    var method = req.acceptsEncodings(["gzip", "deflate", "identity"]) || "identity";

    return renderer.fn(params, method, false)
      .then(function(results) {
        attachData(results.metadata, req, res);
        var cacheKey = method + ":" + req.originalUrl;
        Utils.send(res, results.type, results.contents, results.compression);
        Cache.set(cacheKey, { val: results.contents, type: renderer.type });
      })
      .catch(function(err) {
        if (/not found/i.test(err.message)) res.status(404);
        next(err);
      });
    
  }

}