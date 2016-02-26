/**

  globals.js

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

  // Pipelines
  global.pipelines = require("superloader").pipelines;
  global.pipelines.dir = process.cwd();

  // Add pipelines in config
  for (var ext in global.config.pipelines)
    global.pipelines.addPipeline(ext, global.config.pipelines[ext]);

};
