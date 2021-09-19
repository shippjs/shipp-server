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

  return function(req, res, next) {

    // Parse parameters
    var params = {
      body: req.body || {},
      cookies: req.cookies,
      params: req.params || {},
      query: req.query || {},
      session: req.session || {}
    };

    var method = req.acceptsEncodings(["gzip", "deflate", "identity"]) || "identity";

    return renderer(params, method, false)
      .then(function(results) {
        attachData(results.metadata, req, res);
        Utils.send(res, results.type, results.contents, results.compression, global.shipp.cacheControl);
      })
      .catch(function(err) {
        if (/not found/i.test(err.message)) res.status(404);
        next(err);
      });
    
  }

}