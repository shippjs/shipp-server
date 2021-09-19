
/**

  Attaches cookies and session information to request and response objects.

  @param {Request} req Express request
  @param {Response} res Express response
  @param {Object} object data object - should be the same as passed to compilers

**/

function attachData(req, res, data) {

    // Set cookies
    for (var key in data.cookies || {}) {
      res.cookie(key, data.cookies[key]);
      data.$cookies[key] = data.cookies[key];
    }
  
    // Set session
    for (key in data.session || {}) {
      req.session[key] = data.session[key];
      data.$session[key] = data.session[key];
    }
  
  }
  
  
  