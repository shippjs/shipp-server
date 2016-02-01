
/*

  Compile.js

*/

var _           = require("lodash"),
    Utils       = require("./utils"),
    Bundler     = require("./bundler"),
    Promise     = require("bluebird"),
    express     = require("express"),
    Metadata    = require("./metadata"),
    Motors      = global.engines,
    compileFile = _.curry(_.bind(Motors.compileFile, Motors));



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

function sequence(tasks, initial) {
  return Promise.reduce(tasks || [], function(val, task) {
    return task(val);
  }, initial);
}


function addFile(router, route, file, type, basePath) {

    var ext = file.ext.replace(/^\./, ""),
        tasks = [],
        metadata = {};

    // Add to list of extensions if not present
    if (!Motors.hasEngine(ext)) Motors.addEngine(ext);

    // Extract metadata
    if ("html" === type) {
      metadata = Metadata.extract(Utils.readFileHead(file.path, 500));
      tasks.push(makeDataQuery(metadata.data));
    }

    // File compilation function
    if (file.bundle)
      tasks.push(Bundler.fromFile(file, type).get);
    else
      tasks.push(Promise.promisify(compileFile(file.path)));

    // Route handling function
    function handler(req, res) {

      // Set cookies
      for (var key in metadata.cookies || {})
        res.cookie(key, metadata.cookies[key]);

      // Set session
      for (var key in metadata.session || {})
        req.session[key] = metadata.session[key];

      sequence(tasks, req.params)
      .bind(res)
      .then(res.type(type).send)
      .catch(function(err) { console.log(err); res.sendStatus(500); });

    }

    // Add routes to router
    Utils.makeRoutes(route, file, { type : type, query : metadata.query, bundle : file.bundle }).forEach(function(r) {
      router.get(r, handler);
    });

}


module.exports = function(options) {

  var router = express(),
      files = Utils.mapFiles(options.path, options);

  files.forEach(function(file) { addFile(router, options.route, file, options.ext) });

  // Set up Browsersync
  _(files).filter(function(x) { return !x.bundle }).forEach(function(file) {
    var ext = file.ext.replace(/^\./, "");
    if (!Motors.hasEngine(ext)) Motors.addEngine(ext);
    Utils.watch(options.path, ext, options.ext);
  });

  return router;

};


