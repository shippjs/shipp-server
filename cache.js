/**

  cache.js

  Basic caching for server.

**/

var Cache = module.exports = {

  store: {},

  /**

    Gets an object from the cache.

    @param {String} key The key of the object
    @returns {*} The object

  **/

  get: function(key) {
    return Cache.store[key];
  },


  /**

    Sets an object in the cache.

    @param {String} key The key of the object
    @param {Object} value The object to store

  **/

  set: function(key, value) {
    if ("undefined" === typeof value) return Cache.unset(key);
    Cache.store[key] = value;
  },


  /**

    Unsets an object in the cache.

    @param {String} key The key of the object

  **/

  unset: function(key) {
    delete Cache.store[key];
  }

};
