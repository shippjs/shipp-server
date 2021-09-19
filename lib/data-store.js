/**

  data-store.js

**/


//
//  Dependencies
//

var fs    = require("fs"),
    Utils = require("./utils");


// Database instance
Database = extendDatabase({ data: {} });


/**

  Gives database additional functionality

**/

function extendDatabase(db) {

  // Gets a database key
  db.get = function(key) {
    return Database.data[key];
  };

  // Runs a database query
  db.query = function(query, context, next) {
    query.run(db.get(query.query.table), context, next);
  };

  return db;

}


/**

  Adds a file to the database (or upates if already exists).

  @param {String} filename The file location

**/

function addFile(filename) {

  var file = fs.readFileSync(filename, "utf8"),
      key = Utils.parse(filename).name,
      contents,
      json;

  // Remove directives
  try {
    contents = file.split(/[\n\r]/).filter(function(line) {
      return !/^\s*\/\//.test(line);
    }).join("\n").trim();
    json = ("" === contents) ? [] :JSON.parse(contents);
  } catch (err) {
    global.shipp.logger.warn("Your data located at " + file.path + " has an error in it.");
    global.shipp.logger.warn("Error: " + err.message);
    return;
  }

  // Ensure we have an array
  if (!Array.isArray(json))
    throw new Error("JSON data must be arrays for consistency with external databases (" + filename + ")");

  Database.data[key] = json;

}


/**

  Removes a file from the database.

  @param {String} filename The file location

**/

function removeFile(filename) {

  var key = Utils.parse(filename).name;

  delete Database.data[key];

}


module.exports = function(options) {

  // Allow options to be a string and to use defaults
  if ("string" === typeof options) options = { path: options };

  // Add initial files
  Utils.getFiles(options.path).forEach(function(file) {
    if ("json" !== file.ext) return;
    addFile(file.path, options);
  });

  // Watch for changes
  Utils.watch(options.path, "*", {
    chokidar: {
      ignoreInitial: true,
      ignored: "**/*.!(json)"
    },
    add: addFile,
    change: addFile,
    unlink: removeFile
  });

  return Database;

};
