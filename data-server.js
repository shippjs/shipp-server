
/*

  data-server.js

*/

var assign     = require("lodash/assign"),
    jsonServer = require("json-server");


module.exports = function(options) {

  // Set defaults
  options = assign({}, options);

  return jsonServer.router(global.db.object);

}
