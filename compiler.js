
/*

  Compile.js

*/

var _         = require("lodash"),
    Utils     = require("./utils"),
    Bundler   = require("./bundler"),
    express   = require("express"),
    Metadata  = require("./metadata"),
    Motors    = global.engines;



function makeDataQuery(queries, context) {

  if (queries) {

    var key,
        keys = _.keys(context),
        re   = new RegExp("<(" + keys.join("|") + ")>", "gi"),
        match;

    queries = _.cloneDeep(queries);

    queries.forEach(function(query) {
      for (key in query.filters || {}) {
        if (_.isString(query.filters[key]) && (match = query.filters[key].match(re))) {
          match = match[0];
          query.filters[key] = query.filters[key].replace(new RegExp(match, "g"), context[match.slice(1, match.length-1)]);
        }
      }
    });

    return function() { return global.db.queries(queries); }
  } else
    return _.constant({});

}


function addFile(router, route, file, type, basePath) {

    var ext = file.ext.replace(/^\./, ""),
        handler,
        compiler,
        fetcher,
        metadata = {};

    // Add to list of extensions if not present
    if (!Motors.hasEngine(ext)) Motors.addEngine(ext);

    // Extract metadata
    metadata = ("html" === type) ? Metadata.extract(Utils.readFileHead(file.path, 500)) : {};

    // Data fetching function
    if ("html" === type) {
      fetcher = function(context, next) {
        next(null, _.assign({}, global.vars, context, makeDataQuery(metadata.data, context)()));
      };
    } else
      fetcher = function(context, next) { next(null, {}) };

    // File compilation function
    if (file.bundle) {
      file.folder = "";
      file.name = file.dir.replace(Utils.makePathAbsolute(basePath), "").slice(1);
      bundler = new Bundler({ entry : file.path, filename : file.name + "." + type });
      compiler = function(data, next) { return bundler.get(next); }
    } else
      compiler = function(data, next) { Motors.compileFile(file.path, data, next); };

    /*
    // Set cookies
    for (var key in metadata.cookies || {})
      res.cookie(key, metadata.cookies[key]);

    // Set session
    for (var key in metadata.session || {})
      req.session[key] = metadata.session[key];
    */

    // Route handling function
    handler = function(req, res) {
      var context = _.assign({}, req.params);
      fetcher(context, function(err, data) {
        if (err) return res.sendStatus(500);
        compiler(data, function(err, compiled) {
          if (err) return res.sendStatus(500);
          res.type(type).send(compiled);
        });
      });
    };

    // Add routes to router
    Utils.makeRoutes(route, file, { type : type, query : metadata.query, bundle : file.bundle }).forEach(function(r) {
      router.get(r, handler);
    });

}


module.exports = function(options) {

  var router = express(),
      files = Utils.mapFiles(options.path, options);

  files.forEach(function(file) { addFile(router, options.route, file, options.ext, options.path) });

  // Set up Browsersync
  _(files).filter(function(x) { return !x.bundle }).forEach(function(file) {
    var ext = file.ext.replace(/^\./, "");
    if (!Motors.hasEngine(ext)) Motors.addEngine(ext);
    Utils.watch(options.path, ext, options.ext);
  });

  return router;

};


