/**

  data-server.js

  Exposes JSON server: see https://github.com/typicode/json-server

**/

var jsonServer = require("json-server");


module.exports = function() {

  var router = jsonServer.router(global.db.object);

  // json-server's router absorbs missing routes as the final part of its router
  // We pop this to continue passing along the middleware
  router.stack.pop();

  return router;

};
