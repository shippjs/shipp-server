/**

  data-api.js

**/

var Metadata = require("./metadata"),
    Utils    = require("./utils");


// Stores metadata by filename
var lookups = {};


/**

  Creates a child router for data.
  
  This functionality is in alpha-stages (very immature and in flux)

  @param {Object} file File metadata as returned by Utils#parse
  @param {Array} exposes Array of CRUD commands to expose
  @returns {Router} Router with relative routes

**/

function createRouter(file, exposes) {

  var route = Utils.makeRoute("/", { folder : file.folder, name : file.name }),
      router = global.shipp.router();

  function findIndex(data, id) {
    var idx = -1;

    // Cast id to number if possible
    if (data.length && "number" === typeof(data.id))
      id = parseInt(id)

    for (var i = 0, n = data.length; i < n; i++)
      if (data[i].id === id) {
        idx = i;
        break;
      }
    return idx;
  }

  // This functionality is currently very immature and should be improved substantially over time
  if (exposes.indexOf("create") > -1) {
    router.post(route, function(req, res) {
      var data = global.shipp.db.get(file.name);
      data.push(req.body);
      res.json(req.body);
    })
  }

  if (exposes.indexOf("read") > -1) {
    router.get(route, function(req, res) {
      res.json(global.shipp.db.get(file.name) || []);
    });

    router.get(route + "/:id", function(req, res) {
      var data = global.shipp.db.get(file.name),
          idx = findIndex(data, req.params.id);
      res.json(-1 === idx ? {} : data[idx]);
    });
  }

  if (exposes.indexOf("update") > -1) {
    router.put(route + "/:id", function(req, res) {
      var data = global.shipp.db.get(file.name),
          idx = findIndex(data, req.params.id);
      if (-1 === idx)
        return res.sendStatus(500);
      else {
        data[idx] = req.body;
        res.json(req.body);
      }
    });
  }

  if (exposes.indexOf("delete") > -1) {
    router.delete(route + "/:id", function(req, res) {
      var data = global.shipp.db.get(file.name),
          idx = findIndex(data, req.params.id);
      if (-1 === idx)
        return res.sendStatus(500);
      else
        res.json(data.splice(idx, 1));
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

  var changes,
      metadata,
      directives,
      lookup,
      router;

  // Set up directives
  directives = { "EXPOSE": "list" };

  // Parse metadata
  metadata = Metadata.extract(Utils.readFileHead(file.path, 500), directives);
  lookup = lookups[file.name] || { baseRoute: baseRoute };

  // Create router if needed
  changes = Utils.findDifferences(lookup.metadata, metadata);
  lookup.metadata = metadata;

  if (changes.indexOf("expose") === -1) {
    router = lookup.router;
  } else {
    if (metadata.expose) router = createRouter(file, metadata.expose);
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
