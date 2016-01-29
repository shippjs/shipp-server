
/*

  Compiled.js

*/

var Utils     = require("./utils"),
    fs        = require("fs"),
    Bundler   = require("./bundler"),
    compilers = require("./compilers"),
    express   = require("express");


module.exports = function(options) {

  var router = express(),
      exts = [];

  // Walk through each file
  Utils.eachFile(options.path, options, function(file) {

    var ext      = file.ext.replace(/^\./, ""),
        isBundle = (options.bundleFolders && Utils.isIndexFile(file)),
        compiler = compilers(ext),
        bundler,
        compile;

    // Error message
    if (!compiler || !compiler.isOk()) console.log("Warning: Package missing to compile", ext, "files. Make sure to `npm install` it.");

    // Add to list of extensions if not present
    if (-1 === exts.indexOf(ext)) exts.push(ext);

    // Begin watching bundle if necessary
    if (isBundle) {
      file.folder = "";
      file.name = file.dir.replace(Utils.makePathAbsolute(options.path), "").slice(1);
      bundler = new Bundler({
        entry    : file.path,
        filename : file.name + ".js"
      });
      compile = function(next) { return bundler.get(next); }
    } else {
      compile = function(next) { return compiler.compile(fs.readFileSync(file.path, "utf8"), next); };
    }

    router.get(Utils.makeUrls(options.url, file, options.ext)[0], function(req, res) {
      compile(function(err, compiled) {
        return res.type((options.ext) === "js" ? "application/javascript" : "text/css").send(compiled);
      });
    });

  });

  // Set up Browsersync
  Object.keys(exts).forEach(function(ext) {
    Utils.watch(options.path, ext, options.ext);
  });

  return router;

}
