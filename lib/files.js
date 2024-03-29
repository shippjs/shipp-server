/**

  Watches files and updates Renderers, renderers and handlers

  • addFile
  • removeFile
  • setup (exports)

**/

/**

  Dependencies and exports

**/

var Renderers = require("./renderers");
var Handler = require("./handler");
var Utils = require("./utils");
const { renderers } = require("./renderers");


module.exports = setup;


/**

  Creates compilation pipeline for a file, adds route handlers and global lookup.

  @param {Router} router Parent router
  @param {File} file File information as returned by Utils#parse
  @param {String} [options.url] The base URL for the route
  @param {String} [options.type] The file type (html, js, css)

**/

function addFile(router, file, options) {

  global.shipp.debug("Adding file: " + file.path);
  global.shipp.infograph.addNode(`file:${file.path}`, "file")

  // Add to assets (used in templating, as well as asset pipelines)
  var route = Utils.makeRoute(options.url, file, options);
  var key = Utils.makeRouteKey(options.url, file, options);

  if (!Utils.isHTML(options.type))
    global.shipp.assets[key] = route;

  return createHandlerFromFile(file, options).then(function(handler) {
    router.get(route, handler);
  })

}


function createHandlerFromFile(file, options) {

  // Stop-gap method to identify bundles in real-time
  if ("js" === options.type && !file.bundle && Utils.isIndexFile(file))
    file.bundle = true;

  options = options || {};
  options.url = options.url || "/";

  var source = { file: file, ext: file.ext };

  var key = Utils.makeRouteKey(options.url, file, options);

  return Renderers
    .createRenderer(key, source, options.type)
    .then(function(renderer) {
      return Handler.createHandler(renderer)
    });

}


/**

  Given a file, removes corresponding route handler and global assets.

  @param {Router} router Parent router
  @param {File} file File information as returned by Utils#parse
  @param {String} [options.url] The base URL for the route
  @param {String} [options.type] The file type (html, js, css)

**/

async function removeFile(router, file, options) {

  global.shipp.debug("Removing file: " + file.path);

  // Setup
  options = options || {};
  options.url = options.url || "/";
  var key = Utils.makeRouteKey(options.url, file, options);

  // Remove renderer
  Renderers.removeRenderer(key)
  
  // Trigger update
  await global.shipp.infograph.trigger(`file:${file.path}`)

  var route;
  route = Utils.makeRoute(options.url, file, options);

  // Remove previous route
  Utils.removeRoute(router, route);

  // Delete from assets (used in templating, as well as asset pipelines)
  if (!Utils.isHTML(options.type))
    delete global.shipp.assets[key];

  // Remove node
  global.shipp.infograph.removeNode(`file:${file.path}`)

}


/**

  Creates compilation pipelines for files and add route handlers.

  @param {String} options.exts The default file extension to apply
  @param {String} options.path Directory to process
  @param {String} options.url Base url to route from: url structure = base + directory structure
  @param {Boolean} [options.bundleFolders] If true, applies folder bundling
  @param {Boolean} [options.recursive] If true, processes the directory recursively (default: true)
  @returns {Router} An express-style router

**/

function setup(options) {

  global.shipp.debug("Setting up files at " + options.path);

  var router  = global.shipp.router(),
      ignored = [],
      type    = Array.isArray(options.exts) ? options.exts[0] : options.exts;

  // Since we can have multiple exts, we attach the type to the options object
  options.type = type;

  Utils.getFiles(options.path, options).forEach(function(file) {

    // Handle the file
    addFile(router, file, { type: type, url: options.url });

    // Remove ignored directories from watch list
    if (file.ignored) ignored = ignored.concat(file.ignored);

  });

  Utils.watch(options.path, "*", {

    chokidar: {
      ignoreInitial : true,
      ignored: ignored,
    },

    type: type,

    add: function(file) {
      addFile(router, Utils.parse(file, options.path), { type: type, url: options.url });
    },

    change: function(file) {

      var file = Utils.parse(file, options.path),
          route = Utils.makeRoute(options.url, file, { type: type });

      global.shipp.infograph.trigger(`file:${file.path}`)
      global.shipp.emit("route:refresh", { route: route });

    },

    unlink: function(file) {
      removeFile(router, Utils.parse(file, options.path), { type: type, url: options.url });
    }

  });

  return router;

};
