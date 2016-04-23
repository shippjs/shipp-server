/**

  data-api.js

  Exposes JSON server: see https://github.com/typicode/json-server

**/

var jsonServer = require("json-server");


module.exports = function() {

  var router = jsonServer.router(global.shipp.db.object);

  // json-server's router absorbs missing routes as the final part of its router
  // We modify this to pass when data isn't found
  router.stack[router.stack.length-1].handle = function (req, res, next) {
    if (!res.locals.data)
      next();
    else
      router.render(req, res);
  };

  return router;

};
