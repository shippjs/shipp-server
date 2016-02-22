
/*

  data-server.js

  Exposes JSON server: see https://github.com/typicode/json-server

*/

var jsonServer = require("json-server");


module.exports = function() {

  return jsonServer.router(global.db.object);

}
