/**

  globals.js

  There are multiple globals we choose not to pass between functions:

  • config       Configuration Object
  • db           Database (via LowDB)
  • framework    Underlying framework (Express.js)
  • fs           File System (via MemoryFS)
  • log          Convenience method to log info
  • logger       Logging via Winston
  • pipelines    Compilation pipelines (pipemaker.js)
  • ports        Ports used by application
  • router       Framework's router

  By intentionally poluting the global namespace, we allow users to share
  functionality between their application instance and the core runner.

**/

var express = require("express"),
    events = require("events"),
    reorg = require("reorg"),
    uuid = require("uuid"),
    Universql = require("universql"),
    Utils = require("./utils");


module.exports = function(options) {

  var log;

  // Global namespace/event emitter
  global.shipp = new events();

  // Create secret (for cache warming)
  global.shipp.uuid = uuid.v4();

  // Expose logging and handle exceptions (as well as convenience function)
  global.shipp.logger = require("./logging").setup();
  global.shipp.log = global.shipp.logger.info;
  global.shipp.debug = global.shipp.logger.debug;

  // Configuration
  global.shipp.log("Reading configuration");
  global.shipp.config = require("./config")();

  // Cache
  global.shipp.cache = require("./cache");

  // Requests
  global.shipp.request = Utils.internalRequest;

  // List of key assets
  global.shipp.assets = {};

  // Database: note that we use require if local file and desires otherwise. desires creates
  // npm-debug errors when used with faulty repositories, which can tend to happen with local dev
  global.shipp.log("Attaching database");
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

  // Expose querying, via Universql. This syntax is too layered and needs to change
  global.shipp.query = reorg(function(str, context, next) {
    try { var query = new Universql(str); } catch (err) { next(err); }
    global.shipp.db.query(query, context, next);
  }, "string!", "object", ["function", function() {}]);

  // Exposes framework. While "framework" is the
  // correct usage, we maintain "express", backwards compatibility
  global.shipp.framework = global.shipp.express = require("express");

  // Exposes router and assigns uuid (for ease-of-use in user-defined routes)
  global.shipp.router = function() {
    var router = global.shipp.framework.Router.apply(null, Array.prototype.slice.apply(arguments));
    router.uuid = uuid.v4();
    return router;
  }

  // File system
  global.shipp.log("Attaching file system");
  global.shipp.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.shipp.ports = { server: 27182 };
  } else {
    global.shipp.ports = { server: global.shipp.config.port || process.env.PORT || 3000 };
  }

  // Pipelines
  global.shipp.log("Attaching pipelines");
  global.shipp.pipelines = require("superloader").pipelines;
  global.shipp.pipelines.dir = process.cwd();

  // Add pipelines in config
  for (var ext in global.shipp.config.pipelines)
    global.shipp.pipelines.addPipeline(ext, global.shipp.config.pipelines[ext]);

};
