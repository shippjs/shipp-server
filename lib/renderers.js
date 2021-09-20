/**

  compiler.js

  Powerful compiler for script transpilation, templating and CSS preprocessing.

  As a note: we differentiate between "extensions" and "types". The extension
  is the actual file extension, whereas the type is the extension a file will
  be after processing.

  • getRenderer
  • listRenderers
  • createRenderer
  • addPipeline
  
**/

/**

  Dependencies and exports

**/

var Bundler     = require("./bundler");
var Metadata    = require("./metadata");
var Utils       = require("./utils");

var Pipelines   = global.shipp.pipelines;

var Renderers = module.exports = {
  renderers: {}
};



/**

  Get a list of renderers

  @returns {String[]} ids of all renderers available

  **/

Renderers.listRenderers = function() {
  return Object.keys(this.renderers);
}



/**

  Get a specific renderer

  @param {String} id Renderer's id
  @returns {Renderer} renderer

**/

Renderers.getRenderer = function(id) {
  return this.renderers[id];
}


/**

  Creates a renderer for a blueprint

  @param {String} id Source identifier
  @param {Object} source Object of form { template, file } with either "template" or "file"
  @param {String} type The type of file
  @returns {Function} Handler of form (params = {}, compressionMethod = "identity", maxCompression = false)

  results {
    compression,
    metadata,
    sourceId,
    type,
    contents
  }

**/

Renderers.createRenderer = function(id, source, type) {

  // Add pipeline if needed
  Renderers.addPipeline(source.ext);

  // Get template from source and extract metadata
  source.template = Utils.getTemplate(source);
  var metadata = extractMetadata(source.template, type);

  // At this point, the id will end in :slug if it is a template file
  metadata.isTemplate = /:slug$/.test(id);

  var compiler = createCompiler(source, type);

  // Add data query if necessary
  var query = createQueryFn(metadata.data);

  // Cache
  var fn = createRenderFunction(id, type, metadata, compiler, query);
  Renderers.renderers[id] = new Renderer(id, source, type, metadata, fn);
  
  return Renderers.renderers[id];

}


/**

  Add a pipeline if it does not exist.

  @param {String} ext The file extension for the pipeline

**/

Renderers.addPipeline = function(ext) {

  if (Pipelines.hasPipeline(ext)) return;

  global.shipp.debug("Adding pipeline for ext: " + ext);

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

  Private methods

**/

/**

  Renderer function

**/

function Renderer(id, source, type, metadata, fn) {
  this.id = id;
  this.source = source;
  this.type = type;
  this.metadata = metadata;
  this.fn = fn;
}


/**

  Extracts metadata from a file if appropriate (HTML-like)

  @param {String} template String template
  @param {String} type type of file (this may be different than the extension)
  @returns {Object} Metadata object

**/

function extractMetadata(template, type) {

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

  metadata.isHTML = Utils.isHTML(type);
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
    // Some templating engines (such as pug) require filenames in order to perform relative imports.
    // We encourage compilers to use files if possible and templates only for basic use cases.
    if (source.file)
      fn = Pipelines.compileFile.bind(Pipelines, source.file.path);
    else if (source.template)
      fn = Pipelines.compile.bind(Pipelines, source.ext, source.template);
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


/**

  Creates a render function

  @param {String} id
  @param {String} type
  @param {Object} metadata
  @param {Function} compiler
  @param {Function} query
  @returns {Function} render function

**/

function createRenderFunction(id, type, metadata, compiler, query) {
  return function(params, compressionMethod, maxCompression) {

    // params should include relevant information normally on a req or res object
    var data = metadata.isHTML ? aggregateData(metadata, params) : {};

    // Default compression to identity to maintain compatibility with BrowserSync and other tools
    compressionMethod = compressionMethod || "identity";
    maxCompression = maxCompression || false;
    
    return query(data).then(function(data) { return compiler(data) }).then(function(rendered) {   
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
    if (!queries)
      return Promise.resolve(Object.assign({}, context));
    else
      return Utils.makeQueries(queries, context).then(function(data) {
        return Promise.resolve(Object.assign(data, context));
      });
  };
}
