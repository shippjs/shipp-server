/**

  Launches a shipp-server instance. This allows us to separate the server object
  from the actual running of the server.

**/

// For the moment, we are forcing a production environment. To use a
// non-production environment, please use the CLI.
process.env.NODE_ENV = "production";

require("./lib/server")();
