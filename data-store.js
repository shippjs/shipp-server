
/*

  data-store.js

*/

var fs    = require("fs"),
    low   = require("lowdb"),
    Utils = require("./utils"),
    _     = require("lodash/core"),
    pair  = require("lodash/fromPairs");


/*

  function insertVariables

*/

function insertVariables(query, context) {

  if (!query.filters) return query;

  var query = _.clone(query),
      key,
      keys = _.keys(context),
      re   = new RegExp("<(" + keys.join("|") + ")>", "gi"),
      match;

  for (key in query.filters || {}) {
    if (_.isString(query.filters[key]) && (match = query.filters[key].match(re))) {
      match = match[0];
      query.filters[key] = query.filters[key].replace(new RegExp(match, "g"), context[match.slice(1, match.length-1)]);
    }
  }

  return query;

}



/*

  function extendDatabase

  Adds a "get" function so that lowdb can handle key/values.

*/

function extendDatabase(db) {

  // Gets a database key
  db.get = function(key) {
    var val = db.object[key];
    return (Array.isArray(val)) ? db(key) : _(val);
  }

  // Runs a database query
  db.query = function(query, context) {

    var query = _.isEmpty(context) ? query : insertVariables(query, context),
        chain = _(db.get(query.route).value());

    // Filters
    if (query.filters) chain = chain.filter(query.filters);

    // Fields (if single field, return array)
    if (query.fields) {
      if (Array.isArray(query.fields))
        chain = chain.map(function(x) { return _.pick(x, query.fields) });
      else
        chain = chain.map(query.fields);
    }

    return chain.value();

  }

  // Executes multiple queries and combines into a single object
  db.queries = function(queries, context) {
    if (!Array.isArray(queries)) queries = [queries];
    return _.reduce(queries, function(results, query) {
      var result = db.query(query, context);
      if ("undefined" !== typeof query.idx) result = result[query.idx];
      return _.extend(results, (query.key) ? pair([[query.key, result]]) : result);
    }, {});
  }

  return db;

}


module.exports = function(options) {

  var db = extendDatabase(low()),
      val;

  // Set defaults
  options = _.extend({ path : "./data", route : "/" }, options);

  Utils.mapFiles(options.path).forEach(function(file) {

    var json = JSON.parse(fs.readFileSync(file.path, "utf8")),
        slug = Utils.makeRoutes(options.route, { folder : file.folder, name : "" })[0]

    // If array, use file name as key. Otherwise, parse keys
    if (Array.isArray(json)) {

      key = (slug + "/" + file.name).replace(/\/+/g, "/").replace(/^\/+/, "");
      db.object[key] = json;

    } else {

      // Create path-like keys using directories (and remove leading "/")
      for (key in json) {

        // Remove leading "/" and make db key-friendly
        val = json[key];
        key = (slug + "/" + key).replace(/\/+/g, "/").replace(/^\/+/, "");
        db.object[key] = val;

      }
    }

  });

  return db;

}
