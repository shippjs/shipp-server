/**

  Default routes

**/

var Files = require("./files"),
    statics = require("./statics");


module.exports = function() {

  var router = global.shipp.router();

  for (var route in global.shipp.config.routes) {

    // Copy options and add in route
    options = Object.assign({}, global.shipp.config.routes[route]);
    options.url = route;

    global.shipp.debug("Serving", options.type, "from", route);

    switch (options.type) {
      case "scripts":
      case "styles":
      case "views":
        router.use(Files(options));
        break;
      case "statics":
        router.use(statics(options));
        break;
      default:
        throw new Error("Unrecognized route type", options.type);
    }
  }

  return router;

};
