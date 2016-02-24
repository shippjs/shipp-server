
/**

  Config.js

  Base configuration file for sneakers server.

**/

var Utils = require("./utils"),
    fs = require("fs"),
    defaults,
    config;

var FONT_EXTENSIONS = ["ttf", "otf", "eot", "woff", "svg"];

defaults = {

  data: ["data", "json"],

  locals: {},

  // beforeAll, beforeRoutes, afterRoutes, afterAll
  middleware: {
    beforeAll: "",
    beforeRoutes: "",
    afterRoutes: "",
    afterAll: ""
  },

  pipelines: {
    css: "css",
    html: "html",
    js: "javascript"
  },

  routes: {
    "/"             : { type: "views",    path : "views",         exts : ["html"]                      },
    "/components"   : { type: "statics",  path : "components"                                          },
    "/css"          : { type: "styles",   path : "css",           exts : ["css"]                       },
    "/fonts"        : { type: "statics",  path : "fonts",         exts : FONT_EXTENSIONS               },
    "/images"       : { type: "statics",  path : "images",                                             },
    "/js"           : { type: "scripts",  path : "js",            exts : ["js"],  bundleFolders : true },
    "/scripts"      : { type: "scripts",  path : "scripts",       exts : ["js"],  bundleFolders : true },
    "/styles"       : { type: "styles",   path : "styles",        exts : ["css"]                       },
    "/type"         : { type: "statics",  path : "type",          exts : FONT_EXTENSIONS               },
    "/vendor"       : { type: "statics",  path : "vendor"                                              }
  },

};



module.exports = function() {

  // Load config if available
  try {
    config = JSON.parse(fs.readFileSync(Utils.makePathAbsolute("sneakers.json"), "utf8"));
    config = Object.assign({}, defaults, config);
  } catch (err) {
    config = {};
  }

  // Store global variables
  global.locals = config.locals || {};

  // Copy production variables over second, so as to overwrite non-production
  // when applicable
  if (Utils.isProduction())
    global.locals = Object.assign(global.locals, config["locals:production"] || {});

  return config;

}
