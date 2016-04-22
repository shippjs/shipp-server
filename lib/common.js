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
  global.shipp.log("Adding logging middleware");
  router.use(require("./logging").middleware());

  // Favicon (ensures that it exists)
  global.shipp.log("Adding favicon middleware");
  try {
    fs.lstatSync(faviconFile);
    router.use(favicon(faviconFile));
  } catch (err) {}

  // Method override
  global.shipp.log("Adding method override middleware");
  router.use(require("method-override")());

  // Cookie parsing
  global.shipp.log("Adding cookie parsing middleware");
  router.use(require("cookie-parser")());

  // Express sessions
  global.shipp.log("Adding session middleware");
  router.use(require("express-session")({ secret : "password123", resave : false, saveUninitialized : true }));

  // Body parsing
  global.shipp.log("Adding body parsing middleware");
  router.use(bodyParser.urlencoded({ extended: false }));
  router.use(bodyParser.json());

  return router;

};
