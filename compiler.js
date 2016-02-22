
/*

  Compile.js

*/

var Bundler     = require("./bundler"),
    express     = require("express"),
    Metadata    = require("./metadata"),
    Motors      = global.engines,
    Promise     = require("bluebird"),
    Utils       = require("./utils");
    makeQuery   = Promise.promisify(global.db.queries);

function createDataQuery(queries) {
  return function(context) {
    return makeQuery(queries, context).then(function(data) {
      return Promise.resolve(Object.assign({}, global.vars, context, data));
    });
  }
}


function sequence(tasks, initial) {
  return Promise.reduce(tasks || [], function(val, task) {
    return task(val);
  }, initial);
}


/**

  @returns <String> Directory to ignore (if exists)

**/

function addFile(router, route, file, type, basePath) {

    var tasks = [],
        metadata = {};

    // Add to list of extensions if not present
    if (!Motors.hasEngine(file.ext)) Motors.addEngine(file.ext);

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
      .then(res.type(type).send.bind(res))
      .catch(function(err) { console.log(err); res.sendStatus(500); });

    }

    // Add routes to router
    Utils.makeRoutes(route, file, { type : type, query : metadata.query }).forEach(function(r) {
      router.get(r, handler);
    });

    // If we have a bundle, return the path (we won't "watch" as this happens
    // already in Bundler.
    if (file.bundle) return file.dir;
    return;

}


module.exports = function(options) {

  var router  = express(),
      ignore,
      ignored = [],
      files   = Utils.mapFiles(options.path, options),
      exts    = {};

  files.forEach(function(file) {

    ignore = addFile(router, options.url, file, options.ext);
    if (ignore) ignored.push(ignore);

    exts[file.ext] = 1;

  });

  for (var key in exts)
    Utils.watch(options.path, key, options.ext, { watchOptions : { ignored : ignored } });

  return router;

};
