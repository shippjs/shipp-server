
/*

  Compiled.js

*/

var Utils     = require("./utils"),
    fs        = require("fs"),
    Bundler   = require("./bundler"),
    express   = require("express"),
    Motors    = require("superloader").engines;


module.exports = function(options) {

  var router = express(),
      exts = [];

  // Walk through each file
  Utils.eachFile(options.path, options, function(file) {

    var ext = file.ext.replace(/^\./, ""),
        bundler,
        compile;

    // Add to list of extensions if not present
    if (-1 === exts.indexOf(ext)) exts.push(ext);

    // Begin watching bundle if necessary
    if (file.bundle) {
      file.folder = "";
      file.name = file.dir.replace(Utils.makePathAbsolute(options.path), "").slice(1);
      bundler = new Bundler({
        entry    : file.path,
        filename : file.name + ".js"
      });
      compile = function(next) { return bundler.get(next); }
    } else {
      compile = function(next) { return Motors.compileFile(file.path, {}, next); };
    }

    router.get(Utils.makeUrls(options.url, file, options.ext)[0], function(req, res) {
      compile(function(err, compiled) {
        return res.type((options.ext) === "js" ? "application/javascript" : "text/css").send(compiled);
      });
    });

  });

  // Set up Browsersync
  exts.forEach(function(ext) {
    if (!Motors.hasEngine(ext)) Motors.addEngine(ext);
    Utils.watch(options.path, ext, options.ext);
  });

  return router;

}
