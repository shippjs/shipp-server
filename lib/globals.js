/**

  globals.js

  There are multiple globals we choose not to pass between functions:

  • config    Configuration Object
  • db        Database (via LowDB)
  • fs        File System (via MemoryFS)
  • logger    Logging via Winston
  • server    Server (via BrowserSync)

  By intentionally poluting the global namespace, we allow users to share
  functionality between their application instance and the core runner.

**/

var express = require("express"),
    events = require("events"),
    Utils = require("./utils");


module.exports = function(options) {

  // Global namespace/event emitter
  global.shipp = new events();

  // Expose logging and handle exceptions
  global.shipp.logger = require("./logging").setup();

  // Configuration
  global.shipp.config = require("./config")();

  // Database: note that we use require if local file and desires otherwise. desires creates
  // npm-debug errors when used with faulty repositories, which can tend to happen with local dev
  if (global.shipp.config.adapters.database) {
    pkg = global.shipp.config.adapters.database;
    if ("." === pkg[0] || "/" === pkg[0])
      global.shipp.db = require(Utils.makePathAbsolute(pkg));
    else
      global.shipp.db = require("desires")(pkg);
  } else {
    dataStore = require("./data-store");
    // Iteration isn't data lossy since each call appends to global database
    (global.shipp.config.data || []).forEach(function(store) {
      global.shipp.db = dataStore(store);
    });
  }

  // Exposes express (for ease-of-use in user-defined routes)
  global.shipp.express = require("express");

  // File system
  global.shipp.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.shipp.ports = { server: 27182 };
  } else {
    global.shipp.ports = { server: global.shipp.config.port || process.env.PORT || 3000 };
  }

  // Pipelines
  global.shipp.pipelines = require("superloader").pipelines;
  global.shipp.pipelines.dir = process.cwd();

  // Add pipelines in config
  for (var ext in global.shipp.config.pipelines)
    global.shipp.pipelines.addPipeline(ext, global.shipp.config.pipelines[ext]);

};
