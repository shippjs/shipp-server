
/*

  index.js

  Starting point for development work. Separated from server.js in order to
  eventually allow for production deployments (they would not need BrowserSync).

*/

module.exports = function() {

  var server = require("./server");

  // Start the server
  server();

  // Start browser sync and proxy
  global.server.init({ proxy : "localhost:" + global.ports.proxy });

};
