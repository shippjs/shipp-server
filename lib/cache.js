/**

  cache.js

  Basic caching for server.

**/

var http = require("http"),
    url = require("url"),
    reorg = require("reorg"),
    minimatch = require("minimatch");


var Cache = module.exports = {

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

    Cache warming queue

  **/

  queue: [],


  /**

    Cache warming agent

  **/

  agent: null,


  /**

    Cache status (ready, paused, warming)

  **/

  status: "ready",


  /**

    Warms the cache

    @param {Array} routes Array of routes to warm
    @param {Number} [options.invalidate] Whether to invalidate existing cache (defaults to true)

  **/

  warm: reorg(function(routes, options) {

    if (!routes || !routes.length) return;

    // Additional polymorphism
    if ("string" === typeof routes) routes = [routes];

    // Ensure routes are properly formatted (we use gzip by default)
    routes = routes.map(function(route) {
      if ("/" !== route[0]) route = "/" + route;
      return "gzip:" + route;
    });

    // Invalidation
    if (false === options.invalidate)
      routes = routes.filter(function(route) {
        return !Cache.has(route);
      });
    else
      routes.forEach(Cache.invalidate);

    // Queue
    Cache.queue = Cache.queue.concat(routes);

    // Start warming
    if ("ready" === Cache.status) Cache.warmNext();

  }, null, "object"),


  /**

    Warms the next item in the task queue

  **/

  warmNext: function() {

    if ("paused" === Cache.status) return;

    // Upon completion, destroy agent
    if (!Cache.queue.length) {
      Cache.status = "ready";
      global.shipp.emit("cache:warm");
      if (Cache.agent) {
        Cache.agent.destroy();
        Cache.agent = null;
      }
      return;
    }

    var route = Cache.queue.shift(),
        parts = route.split(":"),
        enc   = parts.shift();

    Cache.status = "warming";

    // If cache has been warmed in the interim, skip to next
    if (Cache.has(route)) return Cache.warmNext();

    // Create agent if it doesn't exist
    if (!Cache.agent) Cache.agent = new http.Agent({ keepAlive: true });

    global.shipp.request(parts.join(":"), {
      agent: Cache.agent,
      headers: { "Accept-Encoding": enc, "Cache-Warm": global.shipp.uuid }
    })

    .then(function() {
      global.shipp.debug("Successfully warmed " + route);
      global.shipp.emit("cache:warmed", { route: route });
    })

    .catch(function(err) {
      global.shipp.logger.warn("Failed to warm " + route);
      global.shipp.emit("cache:error", { route: route });
    })

    .finally(function() {
      Cache.warmNext();
    });

  },


  /**

    Invalidates a route and removes it from the warming queue

  **/

  cool: function(routes) {

    if (!routes || !routes.length) return;

    // Additional polymorphism
    if ("string" === typeof routes) routes = [routes];

    // Ensure routes are properly formatted (we use gzip by default)
    routes = routes.map(function(route) {
      if ("/" !== route[0]) route = "/" + route;
      route = "gzip:" + route;
      Cache.invalidate(route);
      return route;
    });

    // Remove routes from queue
    // TO DO: deal with race conditions if route is currently being warmed
    for (var i = Cache.queue.length - 1; i >= 0; i++) {
      if (routes.indexOf(Cache.queue[i]) > -1)
        Cache.queue.splice(i, 1);
    }

  },


  /**

    Pauses cache warming

  **/

  pause: function() {
    global.shipp.log("Pausing cache warming");
    Cache.status = "paused";
  },


  /**

    Resumes cache warming

  **/

  resume: function() {
    if ("paused" === Cache.status) {
      global.shipp.log("Resuming cache warming");
      Cache.status = "ready";
      Cache.warmNext();
    }
  }

};
