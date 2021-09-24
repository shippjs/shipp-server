/**

  websockets.js

  Wrapper for web sockets: currently uses socket.io

**/

var isPlainObject = require("lodash/isPlainObject");



/**

  Creates websockets

**/

var WebSockets = module.exports = function() {

  var server = global.shipp.http;
  var sockets = global.shipp.config.websockets;

  // If options is falsy, do nothing
  if (!sockets) return

  // Syntactic sugar: we allow "sockets" to be a number or a dictionary
  if (typeof sockets === "number" || typeof sockets === "string")
    sockets = { "default": sockets };

  // Ensure we have array of ports
  if (isPlainObject(sockets))
    throw new Error("The websockets config must either be a port number, the string 'server', or a dictionary of named sockets");

  // Ensure we have default port
  if (!sockets['default'])
    throw new Error("Default port must be specified in websockets configuration");

  var socketIO = require("socket.io");

  // Store to global variable
  global.shipp["socket.io"] = socketIO;

  // Set up all websockets
  global.shipp.sockets = {}
  for (var key in sockets) {
    var port = sockets[key]
    // Check that options are properly formed
    if (typeof port === "number") {
      global.shipp.logger.debug("Opening websocket on port " + port)
      global.shipp.sockets[key] = socketIO(port);
    } else if (isServerLike(port)) {
      global.shipp.logger.debug("Opening websocket and attaching to server")
      global.shipp.sockets[key] = socketIO(server);
    } else
      throw new Error("The websockets config must either be a port number, or the string 'server'");
  }

  // Store shortcut to main socket
  global.shipp.io = global.shipp.sockets['default'];

}


/**

  Helper function to determine if setting is server-like

  @param {*} setting
  @returns {Boolean} true if setting appears to reference the server

**/

function isServerLike(setting) {
  return (
    setting === true ||
    (typeof setting === "string" && ["app", "http", "server", "web"].indexOf(setting) > -1)
  );
}