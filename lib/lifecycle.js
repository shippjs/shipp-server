/**

  lifecycle.js

  Manages graceful spin up and shutdown

**/


/**

  @param {Express} server The express server to manage
  @param {Function} next Callback function (err, port)

**/

module.exports = function(server, next) {

  var port = global.shipp.ports.server;


  // Callback once port has been found
  function portFound() {
    global.shipp.ports.server = port;
    next(null, port);
  }

  // Recursive function to find port
  (function findPort(retries) {

    if (retries <= 0) return next(new Error("Could not find open port"));

    server
    .listen(global.shipp.ports.server)
    .on("listening", portFound)
    .on("error", function(err) {
      port++;
      findPort(--retries);
    });

  })(10);

};
