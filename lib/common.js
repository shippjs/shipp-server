/**

  common.js

  Loads common middleware such as cookie-parsing and session management

**/

var fs = require("fs"),
    favicon = require("serve-favicon"),
    Utils = require("./utils");


module.exports = function() {

  var router = global.express.Router(),
      bodyParser = require("body-parser"),
      faviconFile = Utils.makePathAbsolute(global.config.favicon || "/favicon.ico");

  // Logging
  if (!Utils.isProduction())
    router.use(require("morgan")("dev"));

  // Favicon (ensures that it exists)
  try {
    fs.lstatSync(file);
    router.use(favicon(faviconFile));
  } catch (err) {}

  // Cookie parsing
  router.use(require("cookie-parser")());

  // Express sessions
  router.use(require("express-session")({ secret : "password123", resave : false, saveUninitialized : true }));

  // Body parsing
  router.use(bodyParser.urlencoded({ extended: false }));
  router.use(bodyParser.json());

  return router;

};


