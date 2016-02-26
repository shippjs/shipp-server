/**

  Utils.js

  Various helper functions.

  • getRegExpMatches
  • isIndexFile
  • isProduction
  • makePathAbsolute
  • makeRoutes
  • mapFiles
  • readDirectory
  • readFileHead
  • sequence
  • uniqueExtensions
  • watch

**/


//
//  Dependencies
//

var fs       = require("fs"),
    url      = require("url"),
    path     = require("path"),
    chokidar = require("chokidar"),
    Promise  = require("bluebird"),
    Utils;


module.exports = Utils = {};



/**

  Makes a path absolute (if not already)

  @param {String} p Path
  @returns {String} Absolute path version of a string

**/

Utils.makePathAbsolute = function(p) {

  if (path.isAbsolute(p))
    return p;
  else
    return path.resolve(process.cwd(), p || "");

};



/**

  Tests to see if a file is of form "index*"

  @param {Stats} file File as returned by fs.lstat
  @returns {Boolean} true if a file is index-like

*/

Utils.isIndexFile = function(file) {
  return /^index[^\/]*$/i.test(file.name);
};



/**

  Retrieves all unique file extensions from a directory

  @param {String} p Directory path
  @returns {Array} Array of strings of extensions

**/

Utils.uniqueExtensions = function(p) {
  var exts = {};
  Utils.readDirectory(p).forEach(function(file) {
    if (file.ext && "" !== file.ext) exts[file.ext.toLowerCase()] = 1;
  });
  return Object.keys(exts);
};




/**

  Finds index files and marks as "bundles", then removes sibling and
  sub-diretories

  @param {String} p Absolute path
  @param {Array} files Array of file stats

**/

Utils.flagBundles = function(p, files, ext) {

  var indices = [],
      i, j, n;

  // Filter out index files (outside of master directory)
  i = files.length;
  while (i-- > 0)
    if ((p !== files[i].dir) && Utils.isIndexFile(files[i]))
      indices.push(files.splice(i, 1)[0]);

  // Remove indices that are subdirectories of each other
  i = indices.length;
  while (i-- > 0)
    for (j = 0, n = indices.length; j < n; j++)
      if (i !== j && 0 === indices[i].path.indexOf(indices[j].dir)) {
        indices.splice(i, 1);
        break;
      }

  // Remove files in subdirectories of indices
  i = files.length;
  while (i-- > 0)
    for (j = 0, n = indices.length; j < n; j++)
      if (0 === files[i].path.indexOf(indices[j].dir)) {
        files.splice(i, 1);
        break;
      }

  // Denote indices as bundles
  indices.forEach(function(file) {
    file.bundle = true;
    file.ignored = [
      path.join(file.dir, "*"),
      file.dir + "." + ext
    ];
  });

  // Rejoin indices back into files
  return files.concat(indices);

};



/**

  Sorts and preprocesses files in a directory. Adds absolute and relative paths.

  @param {String} p Path to map
  @param {Object} [options.recursive] If true, processes recursively
  @param {Boolean} [options.bundleFolders] If true, automatically bundles appropriate folders

**/

Utils.mapFiles = function(p, options) {

  var files, i, indices, results = [];
  options = options || {};

  // Make path absolute before call (for comparison after)
  p = Utils.makePathAbsolute(p);
  files = Utils.readDirectory(p, options.recursive);

  // Sort in reverse order so that directory calls come last
  files.sort(function(a, b) { return (a.path < b.path) ? -1 : (a.path > b.path) ? 1 : 0; }).reverse();

  // Move "index" to end so that routes are from specific to unspecific
  i = files.length;
  while (i-- > 0)
    if (Utils.isIndexFile(files[i]))
      Array.prototype.push.apply(files, files.splice(i, 1));

  // Remove subdirectory files if index.* is encountered
  if (options.bundleFolders) files = Utils.flagBundles(p, files, options.ext);

  files.forEach(function(file) {

    // Get rid of leading dot
    file.ext = file.ext.replace(/^\./, "");

    // Attach base path
    file.basePath = p;

    // Attach relative path
    file.folder = path.relative(p, file.path.replace(new RegExp(file.base + "$"), ""));
    results.push(file);

  });

  return results;

};



/**

  Creates appropriate routes for a file: for example, /about/index.html needs
  /about/, /about/index, and /about/index.html.

  Files named "template" are special cases and serve as wildcard route handlers.

  @param {String} baseRoute Base route from which to build
  @param {Stat} file File object (as returned from fs.lStat)
  @param {Object} options Options
  @param {String} [options.type] Default file type (e.g. js for coffee)
  @returns {Array} Array of route strings

**/

Utils.makeRoutes = function(baseRoute, file, options) {

  var re = /\/\/+$/,
      route,
      routes,
      ext;

  options = options || {};

  // By defaulting to file type, we address templating and transpiling. We can
  // resolve coffee files to js, etc. We also remove leading dot.
  ext = options.type || file.ext || "";
  ext = ext.replace(/^\./, "");

  // Create the file's route by appending the folder to the base route. This
  // process is prone to double "//", which must be removed.
  route = (url.resolve((baseRoute + "/").replace(re, "/"), file.folder) + "/").replace(re, "/");

  // HTML-like files named "template" pull their route from the parent directory
  // and pass the subsequent URL on as a "query" parameter
  if (/^html?$/.test(ext) && ("template" === file.name)) {
    route = route.split("/").slice(0, -1).join("/");
    return [route + "/:query"];
  }

  // Add file and default extension
  routes = [url.resolve(route, file.name + "." + ext)];

  // HTML files are special: not only can they be accessed sans extension, if
  // they are named "index", we allow access via a folder.
  if ("html" === ext) {
    routes.push(url.resolve(route, file.name));
    if (Utils.isIndexFile(file)) routes.push(route);
  }

  return routes;

};



/**

  Reads all files in a directory

  @param {String} p Path to read
  @param {Boolean} recursive Whether to read recursively (default: true)

**/

Utils.readDirectory = function(p, recursive) {

  var results = [];

  // Set defaults
  if ("undefined" == typeof recursive) recursive = true;
  p = Utils.makePathAbsolute(p);

  // If directory doesn't exist, return nothing
  try {
    fs.lstatSync(p);
  } catch (err) {
    return results;
  }

  // Read in files
  fs.readdirSync(p).forEach(function(file) {

    var stats, parsed;

    // Read file and stats
    file = path.join(p, file);
    stats = fs.lstatSync(file);

    // Recursively walk directory, or add file
    if (stats.isDirectory()) {
      if (recursive)
        results = results.concat(Utils.readDirectory(file, true));
    } else {
      parsed = path.parse(file);
      parsed.path = file;
      results.push(parsed);
    }

  });

  return results;

};



/**

 Reads a limited number of characters from a file.

 @param {String} path Path to file
 @param {Number} chars Number of chars (defaults to 500)
 @returns {String} First characters for a file

**/

Utils.readFileHead = function(path, chars) {

  var buffer = new Buffer(chars || 500),
      file   = fs.openSync(path, "r"),
      str,
      len;

  // Read in file
  len = fs.readSync(file, buffer, 0, chars, 0);

  // Convert to lines, and discard any fragments
  // (so that we can use template engines without through errors)
  str = buffer.slice(0, len).toString().split("\n");

  return str.slice(0, str.length - 1).join("\n");

};



/**

  Returns all regex matches for an expression

  @param {String} str String to search
  @param {RegExp} pattern Pattern to search with
  @param {Number} [idx] Search component to use
  @returns {Array} Array of strings with matches

**/

Utils.getRegExpMatches = function(str, pattern, idx) {

  var match,
      matches = [];

  // Clone the RE and add global flag (otherwise has endless loop)
  pattern = new RegExp(pattern);
  pattern.global = true;

  // Set default idx
  idx = idx || 0;

  while ((match = pattern.exec(str)))
    matches.push(match[idx]);

  return matches;

};



/**

  Watches a directory for an extension, with options

  @param {String} sourceDir The source directory (without wildcards)
  @param {String} sourceExt The source extension (defaults to "*")
  @param {Object} options The object options to pass to chokidar

**/

Utils.watch = function(sourceDir, sourceExt, options) {

  var p;

  // Defaults
  if ("object" === typeof sourceExt) {
    options = sourceExt;
    sourceExt = "*";
  }

  options = options || {};

  // For source extension, if not wildcard, convert to "*.ext"
  if ("*" !== sourceExt)
    sourceExt = "*." + sourceExt.replace(/^[\*\.]+/g, "");

  // Create path, and ensure that chokidar's cwd is root
  p = Utils.makePathAbsolute(path.join(sourceDir, "**", sourceExt));
  options.cwd = path.parse(p).root;

  chokidar.watch(p, options).on("change", function(file) {
    if (options.type) {
      var parsed = path.parse(file);
      file = path.join(parsed.root, parsed.dir, parsed.name + "." + options.type);
    }
    global.server.reload(file);
  });

};


/**

  Determines whether environment is production

  @returns {Boolean} True if is a production environment

**/

Utils.isProduction = function() {
  return /^prod/i.test(process.env.NODE_ENV);
};



/**

  Runs a sequence of promises, similar to when.js

  @param {Array} tasks Array of "tasks" (functions that return promises)
  @param {*} initial Initial value to call task with

**/

Utils.sequence = function(tasks, initial) {
  return Promise.reduce(tasks || [], function(val, task) {
    return task(val);
  }, initial);
};



/**

  Tests whether a file is a template (HTML-like and named properly)

  @param {Stats} file File as returned by fs.lstat
  @param {String} type The type of file extension
  @returns {Boolean} Returns true is is a template

**/

Utils.isTemplate = function(file, type) {
  return ("template" === file.name) && Utils.isHTML(type);
};

