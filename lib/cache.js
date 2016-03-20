/**

  cache.js

  Basic caching for server.

**/



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
  }


};

