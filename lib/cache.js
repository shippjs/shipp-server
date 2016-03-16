/**

  cache.js

  Basic caching for server.

**/

var lruCache = require("lru-cache"),
    DEFAULT_SIZE = 1e7;


var Cache = module.exports = {

  store: lruCache({

    max: global.shipp.config.compiledCachedSize || DEFAULT_SIZE,

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
    Cache.store.has(key);
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
  }

};
