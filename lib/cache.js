/**

  cache.js

  Basic caching for server.

**/

var http = require("http"),
    url = require("url"),
    minimatch = require("minimatch");


var Cache = global.shipp.cache = module.exports = {

  store: require("lru-cache")({

    max: global.shipp.config.cache.sizeLimit,

    length: function(n, key) {
      if (Buffer.isBuffer(n))
        return n.length + Buffer.byteLength(key);
      else if ("string" === typeof(n))
        return Buffer.byteLength(n) + Buffer.byteLength(key);
      else
        // Assume 4 bytes
        return 4 + Buffer.byteLength(key);
    }

  }),


  has: function(key) {
    return Cache.store.has(key);
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
    if ("undefined" === typeof value) return Cache.del(key);
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
        matches = [];

    ignoreCase = (false === ignoreCase) ? false : true;

    if ("string" === typeof pattern)
      matches = minimatch.match(keys, pattern, { nocase: ignoreCase });
    else if (pattern instanceof RegExp)
      matches = keys.filter(function(key) {
        return pattern.test(key);
      });
    else
      throw new Error("Pattern must be string (glob) or RegExp");

    // Delete from cache
    matches.forEach(Cache.unset);

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

    Warms the cache

    @param {Array} routes Array of routes to warm
    @param {Number} [options.concurrency] Number of requests to make simultaneously (defaults to 1)
    @param {Function} [done] Callback that contains request errors

  **/

  warm: function(routes, options, done) {

    var agent = new http.Agent({ keepAlive: true }),
        errors = [],
        remaining;

    // Polymorphism
    if ("string" === typeof routes)
      routes = [routes];

    if ("function" === typeof options) {
      done = options;
      options = {};
    }

    remaining = routes.length;
    options.concurrency = options.concurrency || 1;

    function complete() {
      options.concurrency++;

      if (--remaining === 0) {
        agent.destroy();
        done(errors.length ? errors : null);
        warmNext();
      }
    }

    function warmNext() {

      var route, req;

      if (!routes.length) return;
      if (--options.concurrency > 0) warmNext();

      route = routes.shift();
      if ("/" !== route[0]) route = "/" + route;

      req = http.request({
        port: global.shipp.ports.server,
        path: route,
        agent: agent,
        headers: {
          "Accept-Encoding": "gzip",
          "Cache-Warm": global.shipp.uuid
        }
      }, function(res) {
        if (200 !== res.statusCode) errors.push(route);
        complete();
      });

      req.on("error", function(err) {
        errors.push(route);
        complete();
      });

      req.end();

    }

    warmNext();

  }

};

