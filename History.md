### v0.17.0
*Aug 15, 2021*
* Adds basic development Dockerfile

### v0.16.4
*May 29, 2017*
* Updates universql-js to v0.3.8 (fixes variable parsing error)

### v0.16.3
*April 29, 2017*
* Updates universql-js to v0.3.8 (fixes filter errors)

### v0.16.2
*April 29, 2017*
* Updates universql-js to v0.3.7

### v0.16.1
*April 29, 2017*
* Updates universql-js to v0.3.5

### v0.16.0
*November 28, 2016*
* Adds string handling in Universql
* Updates superloader to most recent versions of templating libraries
* Adds websockets functionality
* Uses http.createServer and passes to express (to enable same port websockets)
* Fixes bug in where bundler was bundling node_modules

### v0.15.3
*May 13, 2016*
* Fixes hot-reload bug

### v0.15.2
*May 13, 2016*
* Fixes bug where bundle re-compilation was occurring an increasing number of times
* Fixes bug where bundles were being compiled multiple times on startup

### v0.15.1
*May 13, 2016*
Adds a few alpha-features
* Basic real-time bundle identification with route handling
* Hot dependency installations within webpack
* Very basic CRUD support via EXPOSE directive

### v0.15.0
*May 11, 2016*
Our API is currently in flux but in process of stabilizing. Minor versions may be breaking until we reach v1.0.0.
* Adds lib, util and utils to ignored directories
* Adds request body to template context as $body
* Changes "COOKIES" directive to "COOKIE" (to align with res.cookie in Express)
* Changes "route:refresh" events to emit object { route }
* Changes directive format to allow spaces, eliminate need for equal sign (Docker-style)
* Exposes server via global.shipp.server
* No longer "key-ifies" assets (e.g. uses $assets["scripts/app.js"] instead of $assets["scripts:app-js"])
* Refactors Metadata for better abstraction
* Updates Utils#getRegExp to return array of matches

### v0.14.0
*April 24, 2016*
This version includes a breaking change. Please see note on our semver policy.
* Breaking change: removes jsonserver (no hot reload). Currently supports GET
  API and will support additional methods in the future
* Now supports real-time changes to file/data structure and directives
* Separates responsibilities of data-store and data-api (refactored)
* Exposes database querying via global.shipp.query
* Replaces "file:reload" events with "route:refresh"
* Adds method-override to default middleware
* Improves log readability
* Add multiple Util methods: addRouter, removeRouter, findDifferences
* Disables Express' views as Shipp's compiler obviates the need for them

### v0.13.3
*April 20, 2016*
* Update repo location

### v0.13.2
*April 20, 2016*
* Update superloader to v0.5.0 to support wildcard templates

### v0.13.1
*April 11, 2016*
* Fix query-string routing issues

### v0.13.0
*April 10, 2016*
* Expose internal requests via global.shipp.request
* Add ability to pause/resume/cool cache warming
* Add warming queue to cache

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
