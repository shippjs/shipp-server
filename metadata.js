
/*

  Metadata.js

  Metadata is stored as comments near the beginning of an HTML file.
  e.g. DATA=recipes:/api/recipes{slug,url}?recipe.key=<slug>,/users

*/

var Utils     = require("./utils"),
    Universql = require("universql"),
    Metadata  = {};


module.exports = Metadata;


/*

  function extract

  Extracts pertinent metadata for querying.

*/

Metadata.extract = function(str) {

  var names = ["QUERY", "DATA", "COOKIES", "SESSION"],
      re    = new RegExp("(\\b(?:" + names.join("|") + ")\\=[^\\n\\r]+)", "g"),
      meta  = {};

  Utils.getRegExpMatches(str, re).map(Metadata.parse).forEach(function(metadata) {
    meta[metadata["name"]] = metadata.value;
  });

  return meta;

}



/*

  function parse

  Parse query string

*/

Metadata.parse = function(str) {

  var matches = str.trim().split(/\=/),
      name = matches.shift().toLowerCase(),
      value;

  // Handle different types of metadata differently
  switch (name) {
    case "cookies":
      value = JSON.parse("{" + matches[1] + "}");
      break;
    case "session":
      value = JSON.parse("{" + matches[1] + "}");
      break;
    default:
      value = Metadata.parseQuery(matches.join("="));
      break;
  }

  return { name : name, value : value };

}



/*

  function parseQuery

  Parses a specific metadata query.

*/

Universql.addAdapter(require("universql-json"));
var queryCache = {};

Metadata.parseQuery = function(str) {

  var key, idx;

  // Remove index if possible
  if (idx = Utils.getRegExpMatches(str, /\[(\d+)\]$/g)[0])
    str = str.replace(/\[\d+\]$/, "");

  // Allow assignment to key
  if (/^[a-zA-Z_$][0-9a-zA-Z_$]*:["']/.test(str)) {
    str = str.split(":");
    key = str.shift();
    str = str.join(":");
  }

  // Remove quotes
  if (str.length > 1 && str[0] === str[str.length-1] && ("'" === str[0] || '"' === str[0]))
    str = str.slice(1, -1);

  query = queryCache[str] || (queryCache[str] = new Universql(str));

  return { idx : idx, key : key, query : query }

}
