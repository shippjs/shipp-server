/**

  compiler.js

  Powerful compiler for script transpilation, templating and CSS preprocessing.

  As a note: we differentiate between "extensions" and "types". The extension
  is the actual file extension, whereas the type is the extension a file will
  be after processing.

**/

var Bundler     = require("./bundler"),
    express     = require("express"),
    Metadata    = require("./metadata"),
    Pipelines   = global.pipelines,
    Promise     = require("bluebird"),
    Utils       = require("./utils"),
    makeQuery   = Promise.promisify(global.db.queries);


/**

  Extracts metadata from a file if appropriate (HTML-like)

  @param {Stat} file fs.Stat object representing file
  @param {String} [type] Type of file
  @returns {Object} Metadata

**/

function extractMetadata(file, type) {
  if (/^html?$/.test(type || ""))
    return Metadata.extract(Utils.readFileHead(file.path, 500));
  else
    return {};
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

  Creates a route handler for a file

  @param {String} type Type of file
  @param {Function} compiler Function that compiles and returns promise
  @param {Object} [metadata] Extracted metadata
  @return {Function} Route handler of form (req, res)

**/

function createHandler(type, compiler, metadata) {

  var tasks = [compiler],
      key;

  // Add data query if necessary
  metadata = metadata || {};
  if (metadata.query) tasks.unshift(createQueryFn(metadata.query));

  return function(req, res) {

    // Set cookies
    for (key in metadata.cookies || {})
      res.cookie(key, metadata.cookies[key]);

    // Set session
    for (key in metadata.session || {})
      req.session[key] = metadata.session[key];

    Utils.sequence(tasks, req.params)
    .then(res.type(type).send.bind(res))
    .catch(function(err) { console.log(err); res.sendStatus(500); });

  };

}



/**

  Creates a function that runs Universql-style data queries.

  @param {Array} queries The queries to be run
  @returns {Function} Function that performs query and returns promise

**/

function createQueryFn(queries) {
  return function(context) {
    return makeQuery(queries, context).then(function(data) {
      return Promise.resolve(Object.assign({}, global.locals, context, data));
    });
  };
}



/**

  Creates compilation pipeline for a file, and adds route handlers. Currently
  occurs in a single file given need for me
  @returns <Array> Array of directory strings to ignore (if exists)

**/

function addFile(router, route, file, type, basePath) {

    var metadata = extractMetadata(file, type),
        compiler = createCompiler(file, type),
        handler  = createHandler(type, compiler, metadata);

    // Add routes to router
    Utils.makeRoutes(route, file, { type : type }).forEach(function(r) {
      router.get(r, handler);
    });

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

  var router  = express(),
      ignored = [],
      files   = Utils.mapFiles(options.path, options),
      exts    = {},
      type    = Array.isArray(options.exts) ? options.exts[0] : options.exts;

  files.forEach(function(file) {

    // Add to list of extensions if not present
    if (!Pipelines.hasPipeline(file.ext)) Pipelines.addPipeline(file.ext);

    // Handle the file
    addFile(router, options.url, file, type);

    // Add to extension watch list
    exts[file.ext] = 1;

    // Remove ignored directories from watch list
    if (file.ignored) ignored = ignored.concat(file.ignored);

  });

  for (var key in exts)
    Utils.watch(options.path, key, {
      ignoreInitial : true,
      ignored : ignored,
      type : type
    });

  return router;

};
