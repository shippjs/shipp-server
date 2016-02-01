
/*

  Compile.js

*/

var _           = require("lodash"),
    Bundler     = require("./bundler"),
    express     = require("express"),
    Metadata    = require("./metadata"),
    Motors      = global.engines,
    Promise     = require("bluebird"),
    Utils       = require("./utils");


function createDataQuery(queries) {
  return function(context) {
    data = (queries) ? global.db.queries(queries, context) : {};
    return Promise.resolve(_.assign({}, global.vars, context, data));
  }
}


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
      tasks.push(createDataQuery(metadata.data));
    }

    // File compilation function
    if (file.bundle)
      tasks.push(Bundler.fromFile(file, type).get);
    else
      tasks.push(Promise.promisify(Motors.compileFile.bind(Motors, file.path)));

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


