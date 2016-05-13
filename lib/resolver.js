/**

  Resolves dependencies and assets. Coordinates with package managers as
  necessary.

  This module functions as a singleton so that we can track previously made
  attempts and prevent infinite installation loops.

**/
var npm = require("npmwrap");

var Resolver = module.exports = {

  packageRE: /cannot resolve module ['"]([^'"]+)['"]/i,

  /**

    Cache containing installation of missing packages.

  **/

  installs: {},


  /**

    Ensures that an error is in string format.

    @param {Error|String} err Inbound error
    @returns {String} Error message

  **/

  errorMessage: function(err) {

    // Ensure error is a string
    if ("object" === typeof err && err.message)
      return err.message;
    else if ("string" !== typeof err)
      throw new Error("Error is not a string and cannot be scanned for missing modules");

    return err;

  },


  /**

    Determines which package was missing given an error string.

    @param {Error|String} err Inbound error
    @returns {String} The missing package name

  **/

  extractPackageNameFromError: function(err) {
    var name;
    err = Resolver.errorMessage(err);
    return err.match(Resolver.packageRE)[1];
  },


  /**

    Installs a package from the appropriate source.

    @param {String} name The package to install
    @returns {Boolean} Returns true if package was successfully installed

  **/

  installPackage: function(name) {
    global.shipp.logger.warn("Installing missing package " + name + " from npm...");
    return npm.installSync(name, { save: true });
  },


  /**

    Given an error string, installs missing package.

    @param {Error|String} err Inbound error

  **/

  installPackageFromError: function(err) {
    var name = Resolver.extractPackageNameFromError(err);
    return Resolver.installPackage(name);
  },


  /**

    Returns true if error indicates a missing module.

    @param {Error|String} err Inbound error
    @returns {Boolean} Returns true if error reflect missing module

  **/

  isMissingModuleError: function(err) {
    err = Resolver.errorMessage(err);
    return Resolver.packageRE.test(err)
  }


}
