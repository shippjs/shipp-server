/**

  favicon.js

**/

var fs = require("fs"),
    favicon = require("serve-favicon"),
    Utils = require("./utils");


module.exports = function() {

  var file = Utils.makePathAbsolute(global.config.favicon || "/favicon.ico");

  // Ensure that file exists before adding middleware
  try {
    fs.lstatSync(file);
  } catch (err) {
    return null;
  };

  return favicon(file);

};