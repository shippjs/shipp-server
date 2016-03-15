/**

  metadata.js

  Metadata is stored as comments near the beginning of an HTML file.

  Examples:

  Find status and store key/values are copied into templating data:
  DATA=/api/status

  Find albums and store results as `albums` key of templating data:
  DATA=albums:"/api/albums"

  Find single album using $slug
  DATA="/api/albums?id={{$slug}}"[0]

**/


//
//  Dependencies
//

var Utils     = require("./utils"),
    Universql = require("universql");


var Metadata = module.exports = {};


/**

  Extracts pertinent metadata for querying (fully parsed).
  The regex looks for <KEYWORD>=... (until end of line).

  @param {String} str The text to search
  @returns {Object} Metadata in form { query, cookies, session }

**/

Metadata.extract = function(str) {

  var names = ["DATA", "PARAMS", "COOKIES", "SESSION", "CACHE"],
      re    = new RegExp("(\\b(?:" + names.join("|") + ")(\\=[^\\n\\r]+)?)", "g"),
      meta  = {};

  Utils.getRegExpMatches(str, re, 1).map(Metadata.parse).forEach(function(metadata) {

    if ("data" === metadata.name) {
      meta[metadata.name] = meta[metadata.name] || [];
      meta[metadata.name].push(metadata.value);
    } else {
      meta[metadata.name] = metadata.value;
    }

  });

  // Default to caching unless has data query
  if ("undefined" === typeof meta.data && "undefined" == typeof meta.cache)
    meta.cache = true;

  return meta;

};



/**

  Parses a single query string. This differentiates between cookies, session,
  and standard queries.

  @param {String} str String to parse
  @returns {Object} Object containing name and value of query.

**/

Metadata.parse = function(str) {

  var matches = str.trim().split(/\=/),
      name = matches.shift().toLowerCase(),
      value;

  // Handle different types of metadata differently
  switch (name) {
    case "cookies":
      value = JSON.parse("{" + matches[0] + "}");
      break;
    case "session":
      value = JSON.parse("{" + matches[0] + "}");
      break;
    case "params":
      value = matches[0];
      break;
    case "cache":
      value = /false/i.test(matches[0]) ? false : true;
      break;
    default:
      value = Metadata.parseQuery(matches.join("="));
      break;
  }

  return { name : name, value : value };

};



/**

  Parses a Universql-style query.

  @param {String} str String to be parsed
  @returns {Object} Object with query, optional idx and optional key

**/

Universql.addAdapter(require("universql-json"));
var queryCache = {};

Metadata.parseQuery = function(str) {

  var key, idx;

  if (!str || !str.length) throw new Error("No query string provided");

  // Allow assignment to key: DATA=key:"query..." or DATA=key:'query...'
  // Final portion allows for index selection
  if (/^[a-zA-Z_$][0-9a-zA-Z_$]*:".+"(\[(\d+)\])?$/.test(str) || /^[a-zA-Z_$][0-9a-zA-Z_$]*:'.+'(\[(\d+)\])?$/.test(str)) {
    str = str.split(":");
    key = str.shift();
    str = str.join(":");
  }

  // If quotes...
  if ("'" === str[0] || '"' === str[0]) {

    // But not before removing index...
    if ((idx = Utils.getRegExpMatches(str, /\[(\d+)\]$/g, 1)[0]))
      str = str.replace(/\[\d+\]$/, "");

    // Check to see properly formed
    if (str[0] !== str[str.length-1])
      throw new Error("Query quotes are mismatched");

    // Finally, remove the quotes...
    str = str.slice(1, -1);

  }

  // Queries can be cached as we are simply storing translation
  query = queryCache[str] || (queryCache[str] = new Universql(str));

  return { idx : idx, key : key, query : query };

};
