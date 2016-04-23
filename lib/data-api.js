/**

  data-api.js

**/

var Metadata = require("./metadata"),
    Utils    = require("./utils");


// Stores metadata by filename
var lookups = {};


/**

  Compares two sets of metadata for breaking changes.

  @param {Object} A
  @param {Object} B
  @returns {Boolean} True if metadata has changed

**/

function metadataChanged(A, B) {

  var keys = {},
      count = 0;

  // If neither is set, define to be unchanged
  if (!A && !B) return false;

  // If one is undefined but the other isn't, mark as changed
  if (!A !== !B) return true;
  if (!A.expose !== !B.expose) return true;

  // Efficiently check intersection (these are small sets, so hash has no memory problems)
  A.expose.forEach(function(action) { keys[action] = true; });
  B.expose.forEach(function(action) { if (keys[action]) count++; });

  return A.length !== count.length;

}


/**

  Creates a child router for data.

  @param {Object} file File metadata as returned by Utils#parse
  @param {Array} exposes Array of CRUD commands to expose
  @returns {Router} Router with relative routes

**/

function createRouter(file, exposes) {

  var route = Utils.makeRoute("/", { folder : file.folder, name : file.name }),
      router = global.shipp.router();

  if (exposes.indexOf("read") > -1) {
    router.get(route, function(req, res) {
      res.json(global.shipp.db.get(file.name) || []);
    });
  }

  return router;

}


/**

  Sets a router, deletes previous if necessary, and stores into lookup.

  @param {Router} parent The parent router
  @param {Router} child The child router
  @param {Object} lookup The associated lookup information

**/

function setRouter(parent, child, lookup) {

  if (lookup && lookup.router && (!child || lookup.router.uuid !== child.uuid)) {
    Utils.removeRouter(parent, lookup.router);
    delete lookup.router;
  }

  if (child && (!lookup || !lookup.router || lookup.router.uuid !== child.uuid)) {
    Utils.addRouter(parent, child, lookup.baseRoute);
    lookup.router = child;
  }

}


/**

  Adds a file to the API (if doesn't already exist).

  @param {Object} file File metadata as returned by Utils#parse
  @param {String} baseRoute Base route
  @returns {Router} Optionally returns router

**/

function parseFile(file, baseRoute) {

  var metadata,
      directives,
      lookup,
      router;

  // Set up directives
  directives = { "EXPOSE": "list" };

  // Parse metadata
  metadata = Metadata.extract(Utils.readFileHead(file.path, 500), directives);

  lookup = lookups[file.name] || { baseRoute: baseRoute };

  // Create router if needed
  if (metadataChanged(lookup.metadata, metadata)) {
    if (metadata.expose) router = createRouter(file, metadata.expose);
    lookup.metadata = metadata;
    lookups[file.name] = lookup;
  }

  return router;

}



/**

  Adds a file from the API.

  @param {Object} file File metadata as returned by Utils#parse
  @param {Router} router The router that we add paths to
  @param {Object} route The base route

**/

function addFile(file, router, route) {
  var child = parseFile(file, route);
  setRouter(router, child, lookups[file.name]);
}


/**

  Removes a file from the API.

  @param {Object} file File metadata as returned by Utils#parse
  @param {Router} router The router from which to remove the route

**/

function removeFile(file, router) {
  setRouter(router, null, file);
  delete lookups[file.name];
}


module.exports = function() {

  var router = global.shipp.router();

  (global.shipp.config.data || []).forEach(function(folder) {

    var options = { path: folder, url: "/" + folder };

    Utils.getFiles(options.path).forEach(function(file) {
      if ("json" !== file.ext) return;
      addFile(file, router, options.url);
    });

    // Watch for changes
    Utils.watch(options.path, "*", {
      chokidar: {
        ignoreInitial: true,
        ignored: "**/*.!(json)"
      },
      add: function(file) {
        addFile(Utils.parse(file, options.path), router, options.url);
      },
      change: function(file) {
        addFile(Utils.parse(file, options.path), router, options.url);
      },
      unlink: function(file) {
        removeFile(Utils.parse(file, options.path), router);
      }
    });

  });

  return router;

};
