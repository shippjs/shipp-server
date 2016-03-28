/**

  logging.js

  Look to incorporate practices from:
  https://www.loggly.com/ultimate-guide/node-logging-basics/
  http://tostring.it/2014/06/23/advanced-logging-with-nodejs/

**/

var morgan = require("morgan"),
    Utils = require("./utils"),
    winston = require("winston");


module.exports = {

  setup: function() {

    // winston's default console does not handle exceptions well. We use more sensible defaults
    // here. Also note that winston's error handling does not include new lines for non-JSON format
    // and as a result is unreadable. To fix this, we add two console loggers by default, one for
    // errors (JSON-based) and one for non-errors (text-based).
    winston
    .remove(winston.transports.Console)
    .add(winston.transports.Console, {
      level: "debug",
      handleExceptions: false,
      colorize: !Utils.isProduction(),
      json: false
    })
    .add(winston.transports.Console, {
      name: "console-errors",
      level: "error",
      handleExceptions: true,
      colorize: !Utils.isProduction(),
      json: true
    });

    return winston;

  },


  middleware: function() {

    var logger = global.shipp.logger,
        format = Utils.isProduction() ? "combined" : "dev",
        handler,
        stream;

    // Create logging stream. Note that both morgan and winston add \n (we remove this).
    // See http://stackoverflow.com/questions/27906551/node-js-logging-use-morgan-and-winston
    stream = {
      write: function(message) {
        logger.info(message.slice(0, -1));
      }
    };

    handler = morgan(format, { stream: stream });

    return function(req, res, next) {

      if (req.get("Cache-Warm"))
        if (req.get("Cache-Warm") === global.shipp.uuid)
          return next();
        else {
          global.shipp.logger.error("Hack attempt via Cache-Warm header. IP " + req.ip);
          res.sendStatus(500);
        }

      return handler(req, res, next);

    };

  }

};
