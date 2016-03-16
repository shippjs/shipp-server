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

  var log;

  // Global namespace/event emitter
  global.shipp = new events();

  // Expose logging and handle exceptions
  global.shipp.logger = require("./logging").setup();
  log = global.shipp.logger.info;

  // Configuration
  log("Reading configuration");
  global.shipp.config = require("./config")();

  // Database: note that we use require if local file and desires otherwise. desires creates
  // npm-debug errors when used with faulty repositories, which can tend to happen with local dev
  log("Attaching database");
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

  // Exposes framework/router (for ease-of-use in user-defined routes). While "framework" is the
  // correct usage, we maintain "express", backwards compatibility
  global.shipp.framework = global.shipp.express = require("express");
  global.shipp.router = global.shipp.framework.Router;

  // File system
  log("Attaching file system");
  global.shipp.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.shipp.ports = { server: 27182 };
  } else {
    global.shipp.ports = { server: global.shipp.config.port || process.env.PORT || 3000 };
  }

  // Pipelines
  log("Attaching pipelines");
  global.shipp.pipelines = require("superloader").pipelines;
  global.shipp.pipelines.dir = process.cwd();

  // Add pipelines in config
  for (var ext in global.shipp.config.pipelines)
    global.shipp.pipelines.addPipeline(ext, global.shipp.config.pipelines[ext]);

};
