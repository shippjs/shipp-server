
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
  
  }
  
  
  