/**

  defaults.js

  The default JSON configuration presets. We use this rather than a JSON file so
  that we can use `require` instead of fs.readFileSync/JSON.parse, for a speed
  improvement.

**/

module.exports = {

  "data": ["data", "json"],

  "locals": {},

  "middleware": {
    "beforeAll": [],
    "beforeRoutes": [],
    "afterRoutes": [],
    "errorHandler": []
  },

  "pipelines": {},

  "routes": {
    "/"             : { "type": "views",    "path" : "views",      "exts" : ["html"]                             },
    "/components"   : { "type": "statics",  "path" : "components"                                                },
    "/css"          : { "type": "styles",   "path" : "css",        "exts" : ["css"]                              },
    "/fonts"        : { "type": "statics",  "path" : "fonts",      "exts" : ["ttf", "otf", "eot", "woff", "svg"] },
    "/images"       : { "type": "statics",  "path" : "images"                                                    },
    "/js"           : { "type": "scripts",  "path" : "js",         "exts" : ["js"],  "bundleFolders" : true      },
    "/scripts"      : { "type": "scripts",  "path" : "scripts",    "exts" : ["js"],  "bundleFolders" : true      },
    "/styles"       : { "type": "styles",   "path" : "styles",     "exts" : ["css"]                              },
    "/type"         : { "type": "statics",  "path" : "type",       "exts" : ["ttf", "otf", "eot", "woff", "svg"] },
    "/vendor"       : { "type": "statics",  "path" : "vendor"                                                    }
  }

};
