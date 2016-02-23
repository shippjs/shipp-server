
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

  data: [
    { path : "data",       route : "/"                                           },
    { path : "json",       route : "/"                                           }
  ],

  // Scripts are bundled by default, forcing directories with an "index" script to webpack
  scripts: [
    { path : "scripts",    url : "/scripts", exts : ["js"], bundleFolders : true },
  ],

  // Meanwhile, styles don't use bundling
  styles: [
    { path : "css",        url : "/css",     exts : ["css"]                      },
    { path : "styles",     url : "/styles",  exts : ["css"]                      }
  ],

  // Vendor directories may include scripts, styles and JSON. As a result, we presume
  // that these are precompiled and treat them as statics.
  statics: [
    { path : "components", url : "/components"                                   },
    { path : "fonts",      url : "/fonts",   exts : FONT_EXTENSIONS              },
    { path : "images",     url : "/images"                                       },
    { path : "type",       url : "/type",    exts : FONT_EXTENSIONS              },
    { path : "vendor",     url : "/vendor"                                       }
  ],

  // Views are compiled using template engines (when appropriate), HTML otherwise
  views: [
    { path : "pages",      url : "/",        exts : ["html"]                     },
    { path : "views",      url : "/",        exts : ["html"]                     }
  ],

  pipelines: {
    html: "html",
    css: "css",
    js: "javascript"
  },

  locals: {}

};



module.exports = function() {

  // Load config if available
  try {

    config = JSON.parse(fs.readFileSync(Utils.makePathAbsolute("sneakers.json"), "utf8"));
    config = Object.assign({}, config);

    // Key/value assignments
    config.pipelines = Object.assign(config.pipelines || {}, defaults.pipelines);
    config.locals    = Object.assign(config.locals || {}, defaults.locals);

    // Array assignments
    config.data      = (config.data    || []).concat(defaults.data);
    config.scripts   = (config.scripts || []).concat(defaults.scripts);
    config.statics   = (config.statics || []).concat(defaults.statics);
    config.styles    = (config.styles  || []).concat(defaults.styles);
    config.views     = (config.views   || []).concat(defaults.views);

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
