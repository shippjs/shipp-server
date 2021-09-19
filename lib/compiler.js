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



var CACHE_MS = 1000 * 60 * 60 * 24;


/**

  Extracts metadata from a file if appropriate (HTML-like)

  @param {String} id Source identifier
  @param {String} template String template
  @param {String} type The type of file

**/

function extractMetadata(id, template, type) {

  var metadata,
      directives;

  if (Utils.isHTML(type)) {
    // Currently leaving out the PARAM directive (until better planned)
    directives = {
      "DATA"    : "query",
      "QUERY"   : "query",
      "COOKIE"  : "object",
      "SESSION" : "object",
      "CACHE"   : "boolean"
    };
    metadata = Metadata.extract(template.slice(0, 500), directives);
    metadata.isTemplate = Utils.isTemplateFile(id, type);
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
  data.$assets  = Object.assign({}, global.shipp.assets);
  data.$body    = req.body || {};
  data.$cookies = req.cookies;
  data.$params  = req.params;
  data.$query   = req.query;
  data.$session = req.session;

  // Special slug
  if (metadata.isTemplate)
    data.$slug = req.path.replace(req.route.path.split(":")[0], "");

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


// !!! TODO: compiler must be file as well (accept template or file)
// !!! TODO: refactor aggregateData

/**

  Creates a renderer for a blueprint

  @param {String} id Source identifier
  @param {Object} source Object of form { template, file } with either "template" or "file"
  @param {String} type The type of file
  @param {String} pipeline Pipeline to use for compiler
  @return {Function} Handler of form (params = {}, compressionMethod = "identity", maxCompression = false)

  results {
    compression,
    metadata,
    sourceId,
    type,
    contents
  }

**/

function createRenderer(id, source, type, pipeline) {

  // !!! TODO: Handle HTML here, how to map type
  var metadata = extractMetadata(source, type) || {};
  var compiler = createCompiler(source, pipeline);

  var tasks = [compiler];
  var isHTML = Utils.isHTML(type);

  // Add data query if necessary
  if (metadata.data)
    tasks.unshift(createQueryFn(metadata.data));

  return function(params, compressionMethod, maxCompression) {

    // params should include relevant information normally on a req or res object
    var data = isHTML ? aggregateData(metadata, params) : {};

    // Default compression to identity to maintain compatibility with BrowserSync and other tools
    compressionMethod = compressionMethod || "identity";
    maxCompression = maxCompression || false;
    
    return Utils.sequence(tasks, data).then(function(rendered) {
      
      var results = {
        compression: compressionMethod,
        metadata: metadata,
        sourceId: id,
        type: type
      };

      // Uncompressed
      if ("identity" === compressionMethod) {
        results.contents = rendered;
        return results;

      // Compressed
      } else {
        return new Promise(function(resolve, reject) {
          // Note that we are not defaulting to
          Utils.compress(compressionMethod, rendered, maxCompression, function(err, compressed) {
            if (err) return reject(err)
            results.contents = compressed;
            resolve(results);
          });  
        })

      }

    })
  }
  
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

  Add a pipeline if it does not exist.

  @param {String} ext The file extension for the pipeline

**/

function addPipeline(ext) {

  if (Pipelines.hasPipeline(ext)) return;

  try {
    Pipelines.addPipeline(ext);
  } catch (err) {
    global.shipp.logger.warn("");
    global.shipp.logger.warn("WARNING! There is no pipeline available for *." + ext + " files.");
    global.shipp.logger.warn("If this is not fixed, these files will not be served nor compiled.");
    global.shipp.logger.warn("You should add an appropriate pipeline to your shipp.json file.\n");
    return;
  }

}


/**

  Creates compilation pipeline for a file, adds route handlers and global lookup.

  @param {Router} router Parent router
  @param {File} file File information as returned by Utils#parse
  @param {String} [options.url] The base URL for the route
  @param {String} [options.type] The file type (html, js, css)

**/

function addFile(router, file, options) {

  // Stop-gap method to identify bundles in real-time
  if ("js" === options.type && !file.bundle && Utils.isIndexFile(file))
    file.bundle = true;

  options = options || {};
  options.url = options.url || "/";

  // Add to list of extensions if not present
  addPipeline(file.ext);

  var metadata = extractMetadata(file, options.type),
      compiler = createCompiler(file, options.type),
      handler  = createHandler(file, options.type, compiler, metadata),
      key;

  route = Utils.makeRoute(options.url, file, options);
  router.get(route, handler);

  // Add to assets (used in templating, as well as asset pipelines)
  if (!Utils.isHTML(options.type))
    global.shipp.assets[Utils.makeKey(route)] = route;

}


/**

  Given a file, removes corresponding route handler and global assets.

  @param {Router} router Parent router
  @param {File} file File information as returned by Utils#parse
  @param {String} [options.url] The base URL for the route
  @param {String} [options.type] The file type (html, js, css)

**/

function removeFile(router, file, options) {

  var route;

  options = options || {};
  options.url = options.url || "/";

  route = Utils.makeRoute(options.url, file, options);

  // Remove previous route
  Utils.removeRoute(router, route);

  // Delete from assets (used in templating, as well as asset pipelines)
  if (!Utils.isHTML(options.type))
    delete global.shipp.assets[Utils.makeKey(route)];

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

    add: function(file, compiled) {
      addFile(router, Utils.parse(file, options.path), { type: type, url: options.url });
    },

    change: function(file, compiled) {

      var file = Utils.parse(file, options.path),
          route = Utils.makeRoute(options.url, file, { type: type });

      // Monitor metadata only for HTML-files
      // We choose not to store and diff metadata as the add/remove process is
      // extremely fast (circa 1ms).
      if ("html" === options.type) {
        removeFile(router, file, { type: type, url: options.url });
        addFile(router, file, { type: type, url: options.url });        
      }

      global.shipp.emit("route:refresh", { route: route });

    },

    unlink: function(file, compiled) {
      removeFile(router, Utils.parse(file, options.path), { type: type, url: options.url });
    }

  });

  return router;

};
