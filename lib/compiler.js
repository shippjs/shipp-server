/**

  compiler.js

  Powerful compiler for script transpilation, templating and CSS preprocessing.

  As a note: we differentiate between "extensions" and "types". The extension
  is the actual file extension, whereas the type is the extension a file will
  be after processing.

**/

var Bundler     = require("./bundler"),
    Cache       = require("./cache"),
    Metadata    = require("./metadata"),
    Pipelines   = global.shipp.pipelines,
    Promise     = require("bluebird"),
    Utils       = require("./utils"),
    makeQueries = Promise.promisify(Utils.makeQueries);



//
//  Lookup where key is file path and value is array of routes. Used for route removal.
//

var lookupRoutesByFile = {},
    CACHE_MS = 1000 * 60 * 60 * 24;


/**

  Extracts metadata from a file if appropriate (HTML-like)

  @param {Stat} file fs.Stat object representing file
  @param {String} [type] Type of file
  @returns {Object} Metadata

**/

function extractMetadata(file, type) {

  var metadata;

  if (Utils.isHTML(type)) {
    metadata = Metadata.extract(Utils.readFileHead(file.path, 500));
    metadata.isTemplate = Utils.isTemplateFile(file, type);
  } else {
    // For non-HTML files default to caching
    metadata = { cache: true };
  }

  return metadata;

}


/**

  Creates a compiler for a file. For bundles, this means webpacking. Otherwise,
  uses the Pipelines engine.

  @param {Stat} file fs.Stat object representing file
  @param {String} [type] Type of file
  @returns {Function} Function that compiles a file

**/

function createCompiler(file, type) {
  if (file.bundle)
    return Bundler.fromFile(file, type).get;
  else
    return Promise.promisify(Pipelines.compileFile.bind(Pipelines, file.path));
}


/**

  Pulls data from cookies, session, params, query, slug and metadata into
  single data object.

  @param {Request} req Express request
  @param {Response} res Express response
  @param {Object} metadata Metadata object as returns by metadata.js
  @returns {Object} The data object

**/

function aggregateData(req, res, metadata) {

  // Data object will include locals, cookies, session, params, query, slug
  // and if applicable, database query results
  var data = Object.assign({}, global.shipp.locals, res.locals);

  // Attach special variables
  data.$cookies = req.cookies;
  data.$session = req.session;
  data.$params  = req.params;
  data.$query   = req.query;

  // Special slug
  if (metadata.isTemplate)
    data.$slug = req.url.replace(req.route.path.split(":")[0], "");

  // Set cookies
  for (var key in metadata.cookies || {}) {
    res.cookie(key, metadata.cookies[key]);
    data.$cookies[key] = metadata.cookies[key];
  }

  // Set session
  for (key in metadata.session || {}) {
    req.session[key] = metadata.session[key];
    data.$session[key] = metadata.session[key];
  }

  return data;

}


/**

  Creates a route handler for a file

  @param {File} file File information provided by Utils.parse
  @param {String} type Type of file
  @param {Function} compiler Function that compiles and returns promise
  @param {Object} [metadata] Extracted metadata
  @return {Function} Route handler of form (req, res)

**/

function createHandler(file, type, compiler, metadata) {

  var tasks = [compiler],
      isHTML = Utils.isHTML(type),
      cache,
      key;

  // Add data query if necessary
  metadata = metadata || {};
  if (metadata.data) tasks.unshift(createQueryFn(metadata.data));

  // Store cache flag (for speed increase)
  cache = Utils.isProduction() && metadata.cache;

  return function(req, res, next) {

    var target,
        compiled,
        data,
        method,
        cacheKey;

    // Redirect HTML to correct files
    if (isHTML) {
      target = Utils.resolveRoute(req.path);
      if (target !== req.url) return res.redirect(target);
    }

    // Note that the BrowserSync proxy always sets method to identity
    data = isHTML ? aggregateData(req, res, metadata) : {};
    method = req.acceptsEncodings(["gzip", "deflate", "identity"]) || "identity";
    cacheKey = method + ":" + req.url;

    // We are currently assuming a synchronous, non-shared cache. Note that we are currently using
    // req.url. We should eventually offer much more granular caching options. This will currently
    // store multiple copies of the same object in the event that the underlying file served is the
    // same but the path is different.

    // Note that since nearly all browsers support compression, we'll only cache the version requested.
    // This allows us to store more items in the cache, and should increase overall performance.

    if (cache && Cache.has(cacheKey)) {
      Utils.send(res, type, Cache.get(cacheKey), method, CACHE_MS);
      return;
    }

    Utils.sequence(tasks, data).then(function(compiled) {

      var level;

      // Uncompressed
      if ("identity" === method) {

        Utils.send(res, type, compiled, method, CACHE_MS);
        if (cache) Cache.set(cacheKey, compiled);

      // Compressed
      } else {

        Utils.compress(method, compiled, metadata.cache, function(err, compressed) {

          // Fall back on error
          if (err) return Utils.send(res, type, compiled);

          // Send and cache results: should we cache original results too?
          Utils.send(res, type, compressed, method, CACHE_MS);
          if (cache) Cache.set(cacheKey, compressed);

        });

      }

    }).catch(function(err) {
      if (/not found/i.test(err.message)) res.status(404);
      next(err);
    });

  };

}



/**

  Creates a function that runs Universql-style data queries.

  @param {Array} queries The queries to be run
  @returns {Function} Function that performs query and returns promise

**/

function createQueryFn(queries) {
  return function(context) {
    return makeQueries(queries, context).then(function(data) {
      return Promise.resolve(Object.assign(data, context));
    });
  };
}



/**

  Creates compilation pipeline for a file, and adds route handlers. Currently
  occurs in a single file given need for me
  @returns <Array> Array of directory strings to ignore (if exists)

**/

function addFile(router, route, file, type) {

  // Add to list of extensions if not present
  if (!Pipelines.hasPipeline(file.ext)) {
    try {
      Pipelines.addPipeline(file.ext);
    } catch (err) {
      global.shipp.logger.warn("");
      global.shipp.logger.warn("WARNING! There is no pipeline available for *." + file.ext + " files.");
      global.shipp.logger.warn("If this is not fixed, these files will not be served nor compiled.");
      global.shipp.logger.warn("You should add an appropriate pipeline to your shipp.json file.\n");
      return;
    }
  }

  var metadata = extractMetadata(file, type),
      compiler = createCompiler(file, type),
      handler  = createHandler(file, type, compiler, metadata),
  // Store path in lookup (for later removal if necessary)
  if (!Utils.isProduction())
    lookupRoutesByFile[file.path] = routes;
      route    = Utils.makeRoute(route, file, { type: type, params: metadata.params });

  router.get(route, handler);

}


/**

  Removes routes from the router matching the regex.

  @param {Router} router The router to search
  @param {RegExp} re The pattern to match

**/

function removeRoutes(router, routes) {

  if (!router._router || !router._router.stack || !routes || !routes.length) return;

  var stack = router._router.stack,
      re = new RegExp("^(" + routes.map(Utils.escapeRegex).join("|") + ")$");

  // Express keeps routes as a stack in _router.stack. Note that this section
  // is not part of the official API and thus subject to change
  for (var i = stack.length - 1; i >= 0; i--)
    if (stack[i].route && re.test(stack[i].route.path))
      stack.splice(i, 1);

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

module.exports = function(options) {

  var router  = global.shipp.router(),
      ignored = [],
      type    = Array.isArray(options.exts) ? options.exts[0] : options.exts;

  // Since we can have multiple exts, we attach the type to the options object
  options.type = type;

  Utils.getFiles(options.path, options).forEach(function(file) {

    // Handle the file
    addFile(router, options.url, file, type);

    // Remove ignored directories from watch list
    if (file.ignored) ignored = ignored.concat(file.ignored);

  });

  Utils.watch(options.path, "*", {
    chokidar: {
      ignoreInitial : true,
      ignored: ignored,
    },
    type: type,
    add: function(file, compiled) {
      addFile(router, options.url, Utils.parse(file, options.path), type);
    },
    change: function(file, compiled) {
      global.shipp.emit("file:reload", compiled);
    },
    unlink: function(file, compiled) {
      removeRoutes(router, lookupRoutesByFile[file]);
      delete lookupRoutesByFile[file];
    }
  });

  return router;

};
