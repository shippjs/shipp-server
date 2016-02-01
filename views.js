
/*

  Views.js

*/

var Utils     = require("./utils"),
    Metadata  = require("./metadata"),
    fs        = require("fs"),
    _         = require("lodash"),
    express   = require("express"),
    Motors    = require("superloader").engines;


function addEngines(router, engines) {
  for (var ext in engines) {
    Motors.addEngine(ext, engines[ext])
    router.engine(ext, Motors.compileFile.bind(Motors));
  }

  // Add standard html engine if not already added
  if (!router.engines["html"]) {
    router.engine("html", Motors.compileFile.bind(Motors));
  }
}


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


function makeRoutes(route, file, query) {

  var base;

  if (!query) return Utils.makeUrls(route, file, ".html");

  // If name starts with @, treat as template for containing folder
  if ("@" === file.name[0]) {
    base = Utils.makeUrls(route, file, ".html")[0].split("/");
    base.pop();
    base = base.join("/");
  } else {
    base = Utils.makeUrls(route, file, ".html")[0];
  }

  return [base + "/:slug"];

}


module.exports = function(options) {

  var router = express();

  // Set defaults
  options = _.assign({ path : "./views", url : "/" }, { engines : global.engines }, options);
  addEngines(router, options.engines);

  // Set up Browsersync
  Object.keys(global.engines).forEach(function(ext) {
    Utils.watch(options.path, ext, "html");
  });

  if ("undefined" == typeof global.engines) Utils.watch(options.path, "html");

  // Walk through each file
  Utils.eachFile(options.path, { sort : true }, function(file) {

    var metadata = Metadata.extract(Utils.readFileHead(file.path, 500)),
        handler;

    handler = function(req, res) {

      // !!! Add additional context later
      var context = _.clone(req.params);
          data    = _.assign({}, global.vars, makeDataQuery(metadata.data, context)());

      router.render(file.path, data, function(err, html) {

        // Set cookies
        for (var key in metadata.cookies || {})
          res.cookie(key, metadata.cookies[key]);

        // Set session
        for (var key in metadata.session || {})
          req.session[key] = metadata.session[key];

        // Send response
        res.type("text/html").send(html);

      });
    }

    makeRoutes(options.url, file, metadata.query).forEach(function(slug) {
      router.get(slug, handler);
    });

  });

  return router;

}
