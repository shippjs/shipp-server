/**

  lifecycle.js

  Manages graceful spin up and shutdown

**/


module.exports = function(server, next) {

  (function findPort(retries, next) {
    server.listen(global.ports.server, next).on("error", function(err) {
      global.ports.server++;
      findPort(--retries, next);
    });
  })(10, next);

};
