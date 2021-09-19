/**

  compiler.js

  Powerful compiler for script transpilation, templating and CSS preprocessing.

  As a note: we differentiate between "extensions" and "types". The extension
  is the actual file extension, whereas the type is the extension a file will
  be after processing.

  • extractMetadata
  - createCompiler (!!! TODO: NEEDS CACHING)
  • aggregateData
  • createRenderer (!!! TODO: UPDATE WITH SOURCE)
  • createQueryFn
  • addPipeline

**/

/**

  Dependencies and exports

**/

var Bundler     = require("./bundler");
var Metadata    = require("./metadata");
var Utils       = require("./utils");

var Pipelines   = global.shipp.pipelines;

module.exports = {
  extractMetadata: extractMetadata,
  createCompiler: createCompiler,
  aggregateData: aggregateData,
  createRenderer: createRenderer,
  createQueryFn: createQueryFn,
  addPipeline: addPipeline
};



/**

  Extracts metadata from a file if appropriate (HTML-like)

  @param {String} id Source identifier
  @param {String} template String template
  @param {String} type type of file (this may be different than the extension)
  @returns {Object} Metadata object

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
  } else {
    // For non-HTML files default to caching
    metadata = { cache: true };
  }

  return metadata;

}


/**

  Creates a compiler for a file. For bundles, this means webpacking. Otherwise,
  uses the Pipelines engine.

  @param {Object} source object containing file or template
  @returns {Function} Function that compiles a file

**/

function createCompiler(source, type) {
  if (source.file && source.file.bundle)
    return Bundler.fromFile(file, type).get;
  else  {
    var fn
    if (source.template)
      fn = Pipelines.compile.bind(Pipelines, source.ext, source.template);
    else if (source.file)
      fn = Pipelines.compileFile.bind(Pipelines, source.file);
    else
      throw new Error("Cannot create compiler due to invalid source");

    return function(data) {
      return new Promise(function(resolve, reject) {
        fn(data, function(err, compiled) {
          if (err) return reject(err);
          resolve(compiled);    
        });
      })
    }
  }
}


/**

  Pulls data from cookies, session, params, query, slug and metadata into
  single data object.

  @param {Object} metadata Metadata object as returns by metadata.js
  @param {Object} params Params object as provided by handler.js
  @returns {Object} The data object

**/

function aggregateData(metadata, params) {

  // Data object will include locals, cookies, session, params, query, slug
  // and if applicable, database query results
  var data = Object.assign({}, global.shipp.locals, params.locals);

  // Attach special variables
  data.$assets  = Object.assign({}, global.shipp.assets);
  data.$body    = params.body;
  data.$cookies = params.cookies;
  data.$params  = params.params;
  data.$query   = params.query;
  data.$session = params.session;

  // Special slug
  if (params.slug)
    data.$slug = params.slug

  // Set cookies
  for (var key in metadata.cookies || {})
    data.$cookies[key] = metadata.cookies[key];

  // Set session
  for (key in metadata.session || {})
    data.$session[key] = metadata.session[key];

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
  // !!! TODO: add generic source handler
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
    return Utils.makeQueries(queries, context).then(function(data) {
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

