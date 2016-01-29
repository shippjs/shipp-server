
/*

  Metadata.js

  Metadata is stored as comments near the beginning of an HTML file.
  e.g. DATA=recipes:/api/recipes{slug,url}?recipe.key=<slug>,/users

*/

var Utils    = require("./utils"),
    Metadata = {};


module.exports = Metadata;


function isNumeric(x) {
    return !isNaN(parseFloat(x)) && isFinite(x);
}


/*

  function extract

  Extracts pertinent metadata for querying.

*/

Metadata.extract = function(str) {

  var names = ["QUERY", "DATA", "COOKIES", "SESSION"],
      re    = new RegExp("(\\b(?:" + names.join("|") + ")\\=[^\\s\\n\\r]+)", "g"),
      meta  = {};

  Utils.getRegExpMatches(str, re).map(Metadata.parse).forEach(function(metadata) {
    meta[metadata["name"]] = metadata.value;
  });

  return meta;

}



/*

  function parse

  Converts command into multiple querys
  e.g. DATA=<query1>,<query2>

*/

Metadata.parse = function(str) {

  var re = /([^\{,]*\{[^\}]*\}[^,]*|[^\{\},]+),*/g,
      matches = str.split(/\=(.*)/),
      name = matches[0].toLowerCase(),
      value;

  // Handle different types of metadata differently
  switch (name) {
    case "query":
      value = Utils.getRegExpMatches(matches[1], re).map(Metadata.parseQuery)[0];
      if (Array.isArray(value.fields)) value.fields = value.fields[0];
      break;
    case "cookies":
      value = JSON.parse("{" + matches[1] + "}");
      break;
    case "session":
      value = JSON.parse("{" + matches[1] + "}");
      break;
    default:
      value = Utils.getRegExpMatches(matches[1], re).map(Metadata.parseQuery)
      break;
  }

  return { name : name, value : value }

}



/*

  function parseQuery

  Parses a specific metadata query.

*/

Metadata.parseQuery = function(str) {

  var query = {},
      parts = /^(?:([^:]+):)?([^\{?]+)(?:\{([^\}]+)\})?(?:\?([^\[]*))?(?:\[(\d+)\])?$/g.exec(str);

  if (parts) {
    if (parts[1]) query.key     = parts[1];
    if (parts[2]) query.route   = parts[2].replace(/^\//, "");
    if (parts[3]) query.fields  = parts[3].split(",");
    if (parts[4]) query.filters = Metadata.parseFilters(parts[4]);
    if (parts[5]) query.idx     = parseInt(parts[5]);
  }

  return query;

}


/*

  function parseFilters

*/

Metadata.parseFilters = function(str) {

  var results = {},
      parts,
      part;

  str.split("&").forEach(function(filter) {

    parts = filter.split("=");
    part  = parts[1];

    // Cast to types
    if ("false" === part)
      part = false;
    else if ("true" === part)
      part = true;
    else if (isNumeric(part))
      part = parseFloat(part);

    results[parts[0]] = part;

  });

  return results;

}

