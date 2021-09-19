/**

  lifecycle.js

  Manages graceful spin up and shutdown

**/


/**

  @param {Function} next Callback function (err, port)

**/

module.exports = function(next) {

  var server = global.shipp.http;
  var port = global.shipp.ports.server;

  global.shipp.debug("Finding port starting at " + port);

  // Callback once port has been found
  function portFound() {
    global.shipp.log("Open port found. Listening on port " + port);
    global.shipp.ports.server = port;
    next(null, port);
  }

  // Recursive function to find port
  (function findPort(retries) {

    if (retries <= 0) return next(new Error("Could not find open port"));

    server.listen(port, function(err) {
      if (err) {
        port++;
        findPort(--retries)
      } else
        portFound()
    })

  })(10);

};
