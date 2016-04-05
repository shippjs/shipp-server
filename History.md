### v0.12.7
*April 5, 2016*
* Hot fix to repair files named "template"

### v0.12.6
*April 5, 2016*
* No longer compiles routes for "template" and "templates" directories
* Include URL when reporting 404 errors

### v0.12.5
*April 2, 2016*
* Add global variable with asset tracking for templating/CDN
* Fix subdirectory bug in Utils#makeRoutes

### v0.12.4
*April 2, 2016*
* Modify config to use existing environment variables when available

### v0.12.3
*April 2, 2016*
* Fix minimatch bug in cache invalidation

### v0.12.2
*April 2, 2016*
* Improve polymorphism in cache warming

### v0.12.1
*March 31, 2016*
* Fix query string bug in compiler's handlers
* Add strict routing

### v0.12.0
*March 28, 2016*
* Added #keys and #reset methods for cache
* Added cache invalidation with globbing
* Added cache warming
* Improved routing methodology

### v0.11.7
*March 27, 2016*
* Improved: Universql now includes element match capabilities

### v0.11.6
*March 19, 2016*
* Improved: Universql now includes skip and != capabilities

### v0.11.5
*March 19, 2016*
* Fixed: compiler now fails gracefully
* Fixed: routing order issues

### v0.11.4
*March 19, 2016*
* Fixed: problems with superloader

### v0.11.3
*March 19, 2016*
* Improved: basic relative filename support in compilation
* Fixed: caching bug

### v0.11.2
*March 16, 2016*
* Improved: compiler functionality streamlined
* Added: cache now least-recently-used

### v0.11.1
*March 16, 2016*
* Fixed: bad reference to utils.js

### v0.11.0
*March 16, 2016*
* Improved: global now exports framework, router, logger and log
* Improved: production logs now reflect Apache-format
* Added: useful logging during initialization
* Added: now uses winston logging (over console)

### v0.10.4
*March 16, 2016*
* Fixes: favicon bugs

### v0.10.3
*March 16, 2016*
* Fixes: bundler loader path resolution bug

### v0.10.2
*March 16, 2016*
* Fixes: dataStore bug in globals

### v0.10.0
*March 15, 2016*
* Initial release of separate shipp-server