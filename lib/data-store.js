/**

  data-store.js

  Abstracts querying of lowdb.

**/


//
//  Dependencies
//

var fs    = require("fs"),
    low   = require("lowdb"),
    Utils = require("./utils"),
    _     = require("lodash/core");


// Database instance
Database = extendDatabase(low());


/**

  Gives lowdb additional functionality

**/

function extendDatabase(db) {

  // Gets a database key
  db.get = function(key) {
    var val = db.object[key];
    return (Array.isArray(val)) ? db(key) : _(val);
  };

  // Runs a database query
  db.query = function(query, context, next) {
    query.run(db.get(query.query.table).value(), context, next);
  };

  return db;

}


module.exports = function(options) {

  var val;

  // Default to "/" route
  if ("string" === typeof options)
    options = { path : options, url : "/" };

  Utils.getFiles(options.path).forEach(function(file) {

    var json, slug, key;

    // Ensure we are only processing JSON files
    if (!/json$/i.test(file.path)) return;

    try {
      json = JSON.parse(fs.readFileSync(file.path, "utf8"));
      slug = Utils.makeRoute(options.url, { folder : file.folder, name : "" });
    } catch (err) {
      global.shipp.logger.warn("Your data located at", file.path, "has an error in it");
      throw err;
    }

    // If array, use file name as key. Otherwise, parse keys
    if (Array.isArray(json)) {

      key = (slug + "/" + file.name).replace(/\/+/g, "/").replace(/^\/+/, "");
      Database.object[key] = json;

    } else {

      // Create path-like keys using directories (and remove leading "/")
      for (key in json) {

        // Remove leading "/" and make db key-friendly
        val = json[key];
        key = (slug + "/" + key).replace(/\/+/g, "/").replace(/^\/+/, "");
        Database.object[key] = val;

      }
    }

  });

  return Database;

};
