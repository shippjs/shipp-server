
/*

  Utils.js

*/

var fs        = require("fs"),
    url       = require("url"),
    path      = require("path"),
    chokidar  = require("chokidar"),
    Utils;


module.exports = Utils = {};



/*

  function makePathAbsolute

*/

Utils.makePathAbsolute = function(p) {

  if (path.isAbsolute(p))
    return p;
  else
    return path.resolve(process.cwd(), p || "");

}



/*

  function isIndexFile

*/

Utils.isIndexFile = function(file) {
  return /^index[^\/]*$/i.test(file.name);
}


Utils.uniqueExtensions = function(p) {
  var exts = {}
  Utils.readDirectory(p).forEach(function(file) {
    if (file.ext && "" !== file.ext) exts[file.ext.toLowerCase()] = 1;
  });
  return Object.keys(exts);
};


/*

  function mapFiles

  Note that we remove leading "." from file extension

*/

Utils.mapFiles = function(p, options) {

  var files, i, indices, results = [];
  options = options || {};

  // Make path absolute before call (for comparison after)
  p = Utils.makePathAbsolute(p);

  files = Utils.readDirectory(p, options.recursive);

  // Sort in reverse order so that directory calls come last. Then move "index" to end.
  if (options.sort) {
    files.sort(function(a, b) { return (a.path < b.path) ? -1 : (a.path > b.path) ? 1 : 0; }).reverse();
    i = files.length;
    while (i-- > 0)
      if (Utils.isIndexFile(files[i]))
        Array.prototype.push.apply(files, files.splice(i, 1));
  }

  // Remove subdirectory files if index.* is encountered
  if (options.bundleFolders) {

    indices = [];

    // Filter out index files (outside of master directory)
    i = files.length;
    while (i-- > 0) {
      if (Utils.isIndexFile(files[i]) && (p !== files[i].dir))
        Array.prototype.push.apply(indices, files.splice(i, 1));
    }

    // Remove indices that are subdirectories of each other
    i = indices.length;
    while (i-- > 0)
      for (var j = 0, n = indices.length; j < n; j++) {
        if (i !== j && 0 === indices[i].path.indexOf(indices[j].dir)) {
          indices.splice(i, 1);
          break;
        }
      }

    // Remove files in subdirectories of indices
    i = files.length;
    while (i-- > 0)
      for (var j = 0, n = indices.length; j < n; j++)
        if (0 === files[i].path.indexOf(indices[j].dir)) {
          files.splice(i, 1);
          break;
        }

    // Denote indices as bundles
    indices.forEach(function(file) {
      file.bundle = true;
      file.ignored = [
        path.relative(process.cwd(), path.join(file.dir, "*")),
        path.relative(process.cwd(), file.dir + "." + options.ext)
      ];
    });

    // Rejoin indices back into files
    files = files.concat(indices);

  }


  files.forEach(function(file) {
    if (!options.filter || options.filter.indexOf(file.ext) > -1) {
      file.ext = file.ext.replace(/^\./, "");
      file.basePath = p;
      file.folder = path.relative(p, file.path.replace(new RegExp(file.base + "$"), ""));
      results.push(file);
    }
  });

  return results;

}




/*

  function makeRoutes

*/

Utils.makeRoutes = function(baseRoute, file, options) {

  var re = /\/\/+$/,
      route,
      routes,
      ext,
      options = options || {};

  // !!! WHAT TO DO ABOUT EXTENSIONLESS FILES?
  ext = options.type || file.ext || "";
  ext = ext.replace(/^\./, "");
  route = (url.resolve((route + "/").replace(re, "/"), file.folder) + "/").replace(re, "/");

  // Wildcard directories
  if (/^html?$/.test(ext) && options.query) {
    // If name starts with @, look for parent directory;
    if ("@" === file.name[0]) base = base.split("/").slice(0, -1).join("/")
    return [base + "/:slug"];
  }

  // Add file and default extension
  routes = [url.resolve(base, file.name + "." + ext)];

  // HTML files are special: not only can they be accessed sans extension, if they are named
  // "index", we allow access via a folder.
  if ("html" === ext) {
    routes.push(url.resolve(base, file.name));
    if (Utils.isIndexFile(file)) routes.push(base);
  }

  return routes;

}



/*

  function readDirectory

*/

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
        results = results.concat(Utils.readDirectory(file, true))
    } else {
      parsed = path.parse(file);
      parsed.path = file;
      results.push(parsed);
    }

  });

  return results;

}



/*

 function readFileHead

 Reads a limited number of characters from a file.

*/

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

  return str.slice(0, str.length - 1).join("\n")

}



/*

  function getRegExpMatches

*/

Utils.getRegExpMatches = function(str, pattern, idx) {

  var match,
      matches = [];

  // Clone the RE and add global flag (otherwise has endless loop)
  pattern = new RegExp(pattern);
  pattern.global = true;

  // Set default idx
  idx = idx || 0;

  while (match = pattern.exec(str))
    matches.push(match[idx]);

  return matches;

}



/*

  function watch

*/

Utils.watch = function(sourceDir, sourceExt, destExt, options) {

  if ("*" !== sourceExt) sourceExt = "*." + sourceExt.replace(/^[\*\.]+/g, "");
  if ("*" !== destExt) destExt = (destExt) ? ("*." + destExt.replace(/^[\*\.]+/g, "")) : sourceExt;

  options = options || {};

  chokidar.watch(path.join(sourceDir, "**", sourceExt), options).on("change", function(file) {
    global.server.reload(file);
  });

}


Utils.isProduction = function() {
  return /^prod/i.test(process.env.NODE_ENV);
};
