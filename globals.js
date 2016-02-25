
/**

  Globals.js

  There are multiple globals we choose not to pass between functions:

  • config    Configuration Object
  • db        Database (via LowDB)
  • fs        File System (via MemoryFS)
  • server    Server (via BrowserSync)

**/

var dataStore = require("./data-store");


module.exports = function(options) {

  // Configuration
  global.config = require("./config")();

  // Database: dataStore appends to global database. As a result, assigning
  // global.db with each iteration isn't data lossy.
  (global.config.data || []).forEach(function(store) {
    global.db = dataStore(store);
  });

  // File system
  global.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.ports = { server : 27182 };
    global.server = require("browser-sync").create();
  } else {
    global.ports = { server : global.config.port || 3000 };
  }

  // Engines
  global.engines = require("superloader").engines;
  global.engines.dir = process.cwd();

  // Add engines in config
  for (var ext in global.config.pipelines)
    global.engines.addEngine(ext, global.config.pipelines[ext]);

};
