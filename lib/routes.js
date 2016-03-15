/**

  Default routes

**/

var compiler = require("./compiler"),
    statics = require("./statics");


module.exports = function() {

  var router = global.express.Router();

  for (var route in global.config.routes) {

    // Copy options and add in route
    options = Object.assign({}, global.config.routes[route]);
    options.url = route;

    switch (options.type) {
      case "scripts":
      case "styles":
      case "views":
        router.use(compiler(options));
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

