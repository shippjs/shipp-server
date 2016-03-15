/**

  globals.js

  There are multiple globals we choose not to pass between functions:

  • config    Configuration Object
  • db        Database (via LowDB)
  • fs        File System (via MemoryFS)
  • server    Server (via BrowserSync)

  By intentionally poluting the global namespace, we allow users to share
  functionality between their application instance and the core runner.

**/

var express = require("express"),
    Utils = require("./utils");


module.exports = function(options) {

  // Configuration
  global.config = require("./config")();

  // Database: note that we use require if local file and desires otherwise. desires creates
  // npm-debug errors when used with faulty repositories, which can tend to happen with local dev
  if (global.config.adapters.database) {
    pkg = global.config.adapters.database;
    if ("." === pkg[0] || "/" === pkg[0])
      global.db = require(Utils.makePathAbsolute(pkg));
    else
      global.db = require("desires")(pkg);
  } else {
    dataStore = dataStore || require("./data-store");
    // Iteration isn't data lossy since each call appends to global database
    (global.config.data || []).forEach(function(store) {
      global.db = dataStore(store);
    });
  }

  // Exposes express (for ease-of-use in user-defined routes)
  global.express = require("express");

  // File system
  global.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.ports = { server: 27182 };
  } else {
    global.ports = { server: global.config.port || process.env.PORT || 3000 };
  }

  // Pipelines
  global.pipelines = require("superloader").pipelines;
  global.pipelines.dir = process.cwd();

  // Add pipelines in config
  for (var ext in global.config.pipelines)
    global.pipelines.addPipeline(ext, global.config.pipelines[ext]);

};
