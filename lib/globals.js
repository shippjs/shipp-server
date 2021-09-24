/**

  globals.js

  There are multiple globals we choose not to pass between functions:

  • config       Configuration Object
  • db           Database
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
    Utils = require("./utils"),
    get = require("lodash/get");


module.exports = function(options) {

  var log;

  // Global namespace/event emitter
  global.shipp = new events();

  // Create secret (for cache warming)
  global.shipp.uuid = uuid.v4();

  // Expose logging and handle exceptions (as well as convenience function)
  global.shipp.logger = require("./logging").setup();
  global.shipp.log = global.shipp.logger.info.bind(global.shipp.logger);
  global.shipp.debug = global.shipp.logger.debug.bind(global.shipp.logger);

  // Configuration
  global.shipp.debug("Reading configuration");
  global.shipp.config = require("./config")();

  // Requests
  global.shipp.request = Utils.internalRequest;

  // List of key assets
  global.shipp.assets = {};

  var database = get(global.shipp.config, "adapters.database");
  global.shipp.debug("Attaching database: " + (database || "default data store"));
  if (database) {
    if ("." === database[0] || "/" === database[0])
      global.shipp.db = require(Utils.makePathAbsolute(database));
    else
      global.shipp.db = require(database);
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
  global.shipp.debug("Attaching file system");
  global.shipp.fs = new (require("memory-fs"))();

  // Server
  if (options.liveRefresh) {
    // Add internal port (proxy of BrowserSync)
    global.shipp.ports = { server: 27182 };
  } else {
    global.shipp.ports = { server: global.shipp.config.port || process.env.PORT || 3000 };
  }

  // Compilers
  global.shipp.debug("Loading compilers");
  global.shipp.compilers = require(Utils.makePathAbsolute(global.shipp.config.compilers));

  // Renderers
  global.shipp.renderers = require("./renderers")

  // Cache
  global.shipp.cache = require("./cache");

};
