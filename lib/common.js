/**

  common.js

  Loads common middleware such as cookie-parsing and session management

**/

var fs = require("fs"),
    favicon = require("serve-favicon"),
    Utils = require("./utils");


module.exports = function() {

  var router = global.shipp.router(),
      bodyParser = require("body-parser"),
      faviconFile = Utils.makePathAbsolute(global.shipp.config.favicon || "favicon.ico");

  // Logging
  router.use(require("./logging").middleware());

  // Favicon (ensures that it exists)
  try {
    fs.lstatSync(faviconFile);
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
