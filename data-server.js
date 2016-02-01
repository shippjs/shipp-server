
/*

  data-server.js

*/

var jsonServer = require("json-server");


module.exports = function(options) {

  // Set defaults
  options = Object.assign({}, options);

  return jsonServer.router(global.db.object);

}
