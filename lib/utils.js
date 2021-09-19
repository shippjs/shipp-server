/**

  Utils.js

  Various helper functions.

  • getRegExpMatches
  • isIndexFile
  • isProduction
  • makePathAbsolute
  • makeRoutes
  • getFiles
  • readDirectory
  • readFileHead
  • sequence
  • uniqueExtensions
  • watch

**/


//
//  Dependencies
//

var isEqual  = require("lodash/isEqual"),
    fs       = require("fs"),
    http     = require("http"),
    url      = require("url"),
    path     = require("path"),
    reorg    = require("reorg"),
    pair     = require("lodash/fromPairs"),
    sortBy   = require("lodash/sortBy"),
    zlib     = require("zlib"),
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
  return /^index$/i.test(file.name);
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
  @param {String} [options.type] The file type of the bundles (e.g. js)

**/

Utils.getFiles = function(p, options) {

  var files,
      i,
      indices = [],
      templates = [],
      results = [];

  options = options || {};

  // Make path absolute before call (for comparison after)
  p = Utils.makePathAbsolute(p);
  files = Utils.readDirectory(p, options.recursive, p);

  // We need to move from most-specific  to least-specific
  i = files.length;
  while (i-- > 0) {
    if (Utils.isIndexFile(files[i]))
      indices.push(files.splice(i, 1)[0]);
    else if (/^template$/i.test(files[i].name))
      templates.push(files.splice(i, 1)[0]);
  }

  // Template files should be sorted from most-specific to least-specific
  templates = sortBy(templates, function(file) {
    return file.path.replace(/template[^\/]*$/, "");
  }).reverse();

  // Add back indices and templates
  files = files.concat(indices).concat(templates);

  // Remove subdirectory files if index.* is encountered
  if (options.bundleFolders) files = Utils.flagBundles(p, files, options.type);

  return files;

};


/**

  Parses a file name and adds additional information

**/

Utils.parse = function(p, base) {

  var parsed;

  p = Utils.makePathAbsolute(p);
  parsed = path.parse(p);

  // Get rid of leading dot for an extension
  parsed.ext = parsed.ext.replace(/^\./, "");
  parsed.path = p;

  if (base) {
    base = Utils.makePathAbsolute(base);
    parsed.basePath = base;
    parsed.folder = path.relative(base, parsed.path.replace(new RegExp(parsed.base + "$"), ""));
  }

  return parsed;

};


Utils.standardizeExtension = function(ext) {
  return (ext || "").replace(/^\./, "");
};


/**

  Creates appropriate routes for a file: for example, /about/index.html needs
  /about/, /about/index, and /about/index.html.

  Files named "template" are special cases and serve as wildcard route handlers.

  @param {String} baseRoute Base route from which to build
  @param {Stat} file File object (as returned from fs.lStat)
  @param {Object} options Options
  @param {String} [options.type] Default file type (e.g. js for coffee)
  @returns {String} Express-friendly routing string

**/

Utils.makeRoute = function(baseRoute, file, options) {

  var route,
      routes,
      ext;

  options = options || {};

  // We override the file's natural ext to serve from its transpiled ext (e.g html over jade)
  ext = Utils.standardizeExtension(options.type || file.ext);

  // Create the file's base route and add trailing slash, note there will be no wildcards at this point
  if ("/" !== baseRoute[baseRoute.length - 1]) baseRoute += "/";
  route = url.resolve(baseRoute, file.folder).replace(/\/$/, "");

  // HTML-like files named "template" pull their route from the parent directory and pass the
  // subsequent URL on as parameter. We currently ignore user-specified PARAMS (defaults to slug)
  if (Utils.isTemplateFile(file.name, ext)) {
    route = route + "/:slug";

  } else {

    // HTML file get complex as example.com/index.html can be served from example.com, example.com/,
    // example.com/index, example.com/index.htm and example.com/index.html
    if (Utils.isHTML(ext)) {
      route = Utils.escapeRegex(route).replace(/\//g, "\\/");

      if (Utils.isIndexFile(file))
        route = new RegExp("^" + route + "(\\/(index(\\.html?)?)?)?$");
      else
        route = new RegExp("^" + route + "\\/" + Utils.escapeRegex(file.name) + "(\\/|\.html?)?$");

    } else {
      route = route + "/" + file.name + ("" === ext ? ext : "." + ext);
    }

  }

  return route;

};


/**

  Turns a route into a template engine-friendly key.

  @param {String} route The route to key-ify

**/

Utils.makeKey = function(route) {
  return route.replace(/^\//, "");
};


/**

  Resolves routes to base route handlers. This involves removing .html, trailing slashes, etc.

**/

Utils.resolveRoute = function(str) {

  var re = /(\/|(\/index(\.html?)?)?|\.html?)$/;

  // Test early to save CPU cycles
  if (!re.test(str)) return str;
  str = str.replace(re, "");

  // Base URL involves no redirect
  if ("" === str) str = "/";

  return str;

};



/**

  Reads all files in a directory

  @param {String} p Path to read
  @param {Boolean} recursive Whether to read recursively (default: true)
  @param [String] base Optional base path from which to parse

**/

Utils.readDirectory = function(p, recursive, base) {

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

    // Ignore hidden files, or excluded directories
    if (/^\./.test(file) || (/^(includes?|imports?|helpers?|lib|mixins?|utils?)$/i.test(file))) return;

    // Read file and stats
    file = path.join(p, file);
    stats = fs.lstatSync(file);

    // Recursively walk directory, or add file
    if (stats.isDirectory()) {
      // Ignore directories named "template" or "templates"
      if (/^templates?/i.test(file)) return;
      if (recursive)
        results = results.concat(Utils.readDirectory(file, true, base));
    } else {
      results.push(Utils.parse(file, base || p));
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

  // If idx is set, return that. Otherwise return all capture groups.
  if ("undefined" === typeof idx)
    while ((match = pattern.exec(str)))
      matches.push(match.slice(1));

  else
    while ((match = pattern.exec(str)))
      matches.push(match[idx]);

  return matches;

};



/**

  Watches a directory via chokidar

  @param {String} sourceDir The source directory (without wildcards)
  @param {String} sourceExt The source extension (defaults to "*")
  @param {Object} [options.chokidar] Options to pass to chokidar
  @param {Function} [options.*] Event handlers (file, compiled) where * is name of event

**/

var chokidar;
Utils.watch = reorg(function(sourceDir, sourceExt, options) {

  var p;

  // Don't watch in production
  if (Utils.isProduction()) return;
  return;

  chokidar = chokidar || require("chokidar");

  // For source extension, if not wildcard, convert to "*.ext"
  if ("*" !== sourceExt) sourceExt = "*." + sourceExt.replace(/^[\*\.]+/g, "");

  // Ensure we have chokidar options and that chokidar's cwd is root
  p = Utils.makePathAbsolute(path.join(sourceDir, "**", sourceExt));
  options.chokidar = options.chokidar || {};
  options.chokidar.cwd = path.parse(p).root;

  chokidar.watch(p, options.chokidar).on("all", function(event, file) {

    var parsed, compiled;

    if (options[event] || options.all) {

      // File is missing root directory
      file = path.join(options.chokidar.cwd, file);

      // Map file to compiled version
      if (options.type) {
        parsed = path.parse(file);
        compiled = path.join(parsed.root, parsed.dir, parsed.name + "." + options.type);
      }

      // Callback
      if (options[event]) options[event](file, compiled);
      if (options.all) options.all(file, compiled);

    }

  });

}, "string!", ["string", "*"], "object");


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
  (tasks || []).reduce(function(promise, task) {
    return promise.then(function(value) {
      return task(value);
    })
  }, Promise.resolve(initial));
};



/**

  Tests whether a file is a template (HTML-like and named properly)

  @param {String} id id for the file or template
  @param {String} type The type of file extension
  @returns {Boolean} Returns true is is a template

**/

Utils.isTemplateFile = function(id, type) {
  return /^template$/i.test(id) && Utils.isHTML(type);
};


/**

  Tests whether a type is HTML-like

  @param {String} type Type of file
  @returns {Boolean} Returns true if is HTML-like

**/

Utils.isHTML = function(type) {
  return /^\*?\.?html?$/i.test(type);
};


/**

  Tests that an input is a non-array object.

  @param {*} input The item to check
  @returns {Boolean} Returns true if is an object, but not an array

**/

Utils.isPlainObject = function(input) {
  return ("object" == typeof input) && !Array.isArray(input);
};


/**

  Tests for an array of type

  @param {*} input The item to check
  @param {String} type The requisite type
  @returns {Boolean} Returns true if is an array of strings

**/

Utils.isArrayOfType = function(input, type) {
  if (!Array.isArray(input)) return false;
  for (var i = 0, n = input.length; i < n; i++)
    if (type !== typeof input[i]) return false;
  return true;
};


/**

  Traverses a JSON-object and calls function on each end point.

**/

Utils.traverse = function(obj, fn) {

  var key, val;

  for (key in obj) {
    val = obj[key];
    if ("string" === typeof val)
      fn(obj, key, val);
    else if (Utils.isPlainObject(val))
      Utils.traverse(val, fn);
  }

};


/**

  Escapes regex. From lodash.com by John Dalton.

  @param {String} str The string to escape

**/

Utils.escapeRegex = function(str) {
  return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
};



/**

  Compresses a string.

  @param {String} method The compression method
  @param {String} str The string to compress
  @param {Boolean} maxCompress If true, maximum compression level
  @param {Function} next Callback of form (err, compressed)

**/

Utils.compress = function(method, str, level, next) {

  var zip = ("gzip" === method) ? zlib.gzip : zlib.deflate;

  level = level ? zlib.Z_BEST_COMPRESSION : zlib.Z_DEFAULT_COMPRESSION;
  zip(str, { level : level }, next);

};


/**

  Sends a compressed or uncompressed response.

  @param {Response} res The response
  @param {String} type The file type
  @param {Buffer} buf The buffer to send
  @param {String} enc The encoding to use
  @param {Number} [cache] Cache-control setting

**/

Utils.send = function(res, type, buf, enc, cache) {

  // File type
  res.type(type);

  // Cache control
  if (undefined !== cache)
    res.setHeader("Cache-Control", cache);

  // Raw versus compressed
  if ("identity" === enc || !enc) {
    res.send(buf);
  } else {
    res.setHeader("Content-Encoding", enc);
    res.removeHeader("Content-Length");
    res.send(buf);
  }

};


/**

  Attaches middleware to server, or ignores if blank.

  @param {Express} server Server instance
  @param {Middleware} library (req, res)-style middleware
  @param {Boolean} [skipCheck] If true, ignores errors (defaults to false)

**/

Utils.useMiddleware = function(server, library, skipCheck) {
  if (!library || Array.isArray(library) && !library.length) {
    if (skipCheck) return;
    return new Error("No middleware added");
  }
  server.use(library);
};


/**

  Executes multiple queries and combines into a single object

  @param {Array} queries Array of UniversQL queries
  @param {Object} context Templating variables to insert into the query
  @return {Promise}

**/

Utils.makeQueries = function(queries, context) {

  var results = {},
      remaining;

  // Ensure that queries is an array
  queries = queries || [];
  if (!Array.isArray(queries)) queries = [queries];

  remaining = queries.length;
  if (!remaining) return next(null, {});

  return new Promise(function(resolve, reject) {
    queries.forEach(function(query) {
      global.shipp.db.query(query.query, context, function(err, result) {
  
        if ("undefined" !== typeof query.idx) {
          if (!result.length)
            return reject(new Error("Result not found"));
          result = result[query.idx];
        }
  
        results = Object.assign(results, (query.key) ? pair([[query.key, result]]) : result);
        if (--remaining === 0)
          return resolve(results);
  
      });
    });
  });

};


/**

  Makes an internal request to the server

  @param {String} route Internal route (e.g. /scripts/main.js)
  @param {Agent} [options.agent] Optional HTTP agent
  @param {Object} [options.headers] HTTP headers

**/

Utils.internalRequest = reorg(function(route, options) {

  var req,
      config = {
        port: global.shipp.ports.server,
        path: route
      };

  // Set options
  if (options.agent) config.agent = options.agent;
  if (options.headers) config.headers = options.headers;

  return new Promise(function(resolve, reject) {

    req = http.request(config, function(res) {

      if (200 !== res.statusCode) return reject(new Error("HTTP Error: " + res.statusCode));
      if (options.skipBody) return resolve();

      var body = "";
      res.setEncoding(options.encoding || "utf8");
      res.on("data", function (chunk) { body += chunk; });
      res.on("end", function() { resolve(body); });
      res.on("error", reject);

    });

    req.on("error", reject);
    req.end();

  });

}, "string!", "object");


/**

  Removes a route from the router matching the regex.

  @param {Router} router The router to search
  @param {RegExp} re The pattern to match

**/

Utils.removeRoute = function(router, route) {

  if (!router || !router.stack || !route) return;

  var stack = router.stack,
      str = route.toString();

  // Express keeps routes as a stack in _router.stack. Note that this section
  // is not part of the official API and thus subject to change
  for (var i = stack.length - 1; i >= 0; i--)
    if (stack[i].route && stack[i].route.path.toString() === str) {
      stack.splice(i, 1);
      break;
    }

};



/**

  Adds a child router to a parent router, only if child exists.

  @param {Router} parent The parent router
  @param {Router} child The child router
  @param {String} route The relative route

**/

Utils.addRouter = function(parent, child, route) {
  if (!child) return;
  parent.use(route, child);
};


/**

  Removes a child router from a parent router.

  @param {Router} parent The router to search
  @param {Router} child The router to remove

**/

Utils.removeRouter = function(parent, child) {

  if (!parent || !parent.stack || !child) return;

  var stack = parent.stack;

  // Express keeps routes as a stack in _router.stack. Note that this section
  // is not part of the official API and thus subject to change
  for (var i = stack.length - 1; i >= 0; i--) {
    if (stack[i].handle && stack[i].handle.uuid === child.uuid) {
      stack.splice(i, 1);
      break;
    }
  }

};


/**

  Finds differences between two metadata objects, one layer deep

  @param {Object} A
  @param {Object} B
  @returns {Array} Keys that are different

**/

Utils.findDifferences = function(A, B) {

  var diffs = [];

  // Begin with empty objects
  if (!A) return !B ? [] : Object.keys(B || {});
  if (!B) return Object.keys(A || {});

  // Loop through A
  for (var key in A)
    if ("undefined" === typeof B[key])
      diffs.push(key);
    else
      if (!isEqual(A[key], B[key])) diffs.push(key)

  // Loop through B
  for (var key in B)
    if ("undefined" === typeof A[key])
      diffs.push(key);

  return diffs;

};
