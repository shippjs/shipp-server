/**

  logging.js

  Look to incorporate practices from:
  https://www.loggly.com/ultimate-guide/node-logging-basics/
  http://tostring.it/2014/06/23/advanced-logging-with-nodejs/

**/

var assign = require("lodash/assign"),
    morgan = require("morgan"),
    Utils = require("./utils"),
    winston = require("winston");


module.exports = {

  setup: function() {

    const debugFormat = Utils.isProduction() ? {} : { format: winston.format.cli() };

    // We add two console loggers by default, one for errors (JSON-based) and one for non-errors (text-based).
    // winston 3.x introduces the concept of a formatter. The combine method is poorly designed,
    // thus we have to use array handling methods in order to achieve our desired results
    return winston.createLogger({
      transports: [
        new winston.transports.Console(assign({
          level: "debug",
          handleExceptions: false
        }, debugFormat)),
        new winston.transports.Console({
          name: "console-errors",
          level: "errors",
          handleExceptions: false,
          format: winston.format.json()
        })
      ]
    });

  },


  middleware: function() {

    var logger = global.shipp.logger,
        format = Utils.isProduction() ? ":remote-addr - :response-time ms - :status :method :url - :user-agent" : "dev",
        handler,
        stream;

    // Create logging stream. Note that both morgan and winston add \n (we remove this).
    // See http://stackoverflow.com/questions/27906551/node-js-logging-use-morgan-and-winston
    stream = {
      write: function(message) {
        logger.info(message.slice(0, -1), { tags: ["express"] });
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
