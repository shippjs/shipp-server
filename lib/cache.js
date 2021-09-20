/**

  cache.js

  Basic caching for server. Entries consist of:
  • key:   cache key for reference
  • ttl:   cache time to live
  • type:  file type (for sending)
  • val:   value

  Middleware creates a cache key based on the route and returns the entry if available.

**/

var get = require("lodash/get");
var Utils = require("./utils");
var minimatch = require("minimatch");


var Cache = module.exports = {

  store: require("lru-cache")({

    max: get(global.shipp, "config.cache.sizeLimit"),

    length: function(cached, key) {

      var val = cached.val;

      // Assume vanilla types have byte size 4, calculate all others
      var size = 4;
      if (Buffer.isBuffer(val))
        size = val.length;
      else if ("string" === typeof(val))
        size = Buffer.byteLength(val);

      // Object keys = 10 (string length of ttl, type, val), ttl = 4. Total = 14
      return size + 17 + Buffer.byteLength(key) + Buffer.byteLength(cached.type || "");

    }

  }),


  has: function(key) {
    return Cache.store.has(key);
  },


  length: function() {
    return Cache.store.length;
  },

  /**

    Gets an object from the cache.

    @param {String} key The key of the object
    @returns {*} The object

  **/

  get: function(key) {
    return Cache.store.get(key);
  },


  /**

    Sets an object in the cache.

    @param {String} key The key of the object
    @param {Object} value The object to store

  **/

  set: function(key, value) {
    if ("undefined" === typeof value)
      Cache.unset(key);
    else
      Cache.store.set(key, value);
  },


  /**

    Unsets an object in the cache.

    @param {String} key The key of the object

  **/

  unset: function(key) {
    Cache.store.del(key);
  },


  /**

    Invalidates objects in the cache via glob matching.

    @param {String} pattern Glob pattern (see https://github.com/isaacs/minimatch)
    @param {Boolean} [ignoreCase] When true, performs case insensitive match (default: true)

    @returns {Array} Array of strings invalidated

  **/

  invalidate: function(pattern, ignoreCase) {

    var keys = Cache.store.keys(),
        matches = [],
        re;

    ignoreCase = (false === ignoreCase) ? false : true;

    // minimatch.match seems to have issues with matching slashes. Use its RegExp instead.
    // We prefix gzip, etc. in order to allow the user to think of patterns in terms of "routes".
    if ("string" === typeof pattern)
      re = minimatch.makeRe("?(gzip:|identity:|deflate:)" + pattern, { nocase: ignoreCase });
    else
      re = pattern;

    if (re instanceof RegExp)
      matches = keys.filter(function(key) {
        return re.test(key);
      });
    else
      throw new Error("Pattern must be string (glob) or RegExp");

    // Delete from cache
    matches.forEach(Cache.unset);
    global.shipp.debug("Invalidated " + matches.length + " route(s) given " + pattern);

    return matches;

  },


  /**

    Clear the cache entirely, throwing away all values.

  **/

  reset: function() {
    return Cache.store.reset();
  },


  /**

    Return an array of the keys in the cache.

  **/

  keys: function() {
    return Cache.store.keys();
  },


  /**

    Middleware

    Note: we do not currently use query strings as part of caching. To do this effectively,
    certain parameters (such as those used in web tracking) must be removed.

  **/

  middleware: function() {
    
    var router = global.shipp.router();

    router.use("*", function(req, res, next) {
   
      var compression = req.acceptsEncodings(["gzip", "deflate", "identity"]) || "identity";

      // Attach cacheKey to the request
      var cacheKey = res.locals.cacheKey = compression + ":" + req.originalUrl;

      if (Cache.has(cacheKey)) {
        var cached = Cache.get(cacheKey);
        Utils.send(res, cached.type, cached.val, compression, cached.ttl);
      } else {
        next();
      }

    })

    global.shipp.debug("Caching middleware added");
  
    return router;
  
  }

};
