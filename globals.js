
/*

  Globals.js

  There are multiple globals we choose not to pass between functions:

  • config    Configuration Object
  • db        Database (via LowDB)
  • fs        File System (via MemoryFS)
  • server    Server (via BrowserSync)

*/


module.exports = (function() {

  // Configuration
  global.config = require("./config")();

  // Database
  global.db = require("./data-store")();

  // File system
  global.fs = new (require("memory-fs"))();

  // Server
  global.server = require("browser-sync").create();

});