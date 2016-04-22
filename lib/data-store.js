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


/**

  Adds a file to the database and creates corresponding routes

  @param {String} file The file location
  @param {Object} options.url The base url

**/

function addFile(file, options) {

  var json, slug, key;

  try {
    json = JSON.parse(fs.readFileSync(file.path, "utf8"));
    slug = Utils.makeRoute(options.url, { folder : file.folder, name : "" });
  } catch (err) {
    global.shipp.logger.warn("Your data located at", file.path, "has an error in it");
    return;
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

}


module.exports = function(options) {

  var val;

  // Default to "/" route
  if ("string" === typeof options)
    options = { path: options, url: "/" };

  // Add initial files
  Utils.getFiles(options.path).forEach(function(file) {
    if (!/json$/i.test(file.path)) return;
    addFile(file, options)
  });

  return Database;

};
