
/*

  Utils.js

*/

var __rootDir = process.cwd(),
    fs        = require("fs"),
    url       = require("url"),
    path      = require("path"),
    Utils;


module.exports = Utils = {};


/*

  function getRootPath

*/

Utils.getRootPath = function() {
  return __rootDir;
}



/*

  function makePathAbsolute

*/

Utils.makePathAbsolute = function(p) {

  return path.resolve(Utils.getRootPath(), p || "");

}



/*

  function isIndexFile

*/

Utils.isIndexFile = function(file) {
  return /index[^\/]*$/.test(file.name);
}


Utils.uniqueExtensions = function(p) {
  return Utils.readDirectory(p).reduce(function(arr, file) {
    if (-1 === arr.indexOf(file.ext)) arr.push(file.ext);
    return arr;
  }, []);
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
    indices.forEach(function(file) { file.bundle = true });

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

Utils.makeRoutes = function(route, file, options) {

  var base,
      routes,
      ext,
      options = options || {};

  // !!! WHAT TO DO ABOUT EXTENSIONLESS FILES?
  ext = options.type || file.ext;
  ext = ("undefined" == typeof ext) ? "" : ext.replace(/^\./, "");
  base = (url.resolve((route + "/").replace(/\/\/$/, "/"), file.folder) + "/").replace(/\/\/$/, "/");

  // Wildcard directories
  if ("html" === ext && options.query) {
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

  var buffer = new Buffer(chars),
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

Utils.getRegExpMatches = function(str, re) {

  var match,
      matches = [];

  while (match = re.exec(str))
    matches.push(match[1]);

  return matches;

}



/*

  function watch

*/

Utils.watch = function(sourceDir, sourceExt, destExt, options) {

  if ("*" !== sourceExt) sourceExt = "*." + sourceExt.replace(/^[\*\.]+/g, "");
  if ("*" !== destExt) destExt = (destExt) ? ("*." + destExt.replace(/^[\*\.]+/g, "")) : sourceExt;

  options = options || {};

  global.server.watch(path.join(sourceDir, "**", sourceExt), options, function(event, file) {
    if ("change" === event) global.server.reload(destExt);
  });

}
