/**

  Simple file to launch a server. This allows us to separate CLI-driven
  development work from production-ready server.

**/

// For the moment, we are forcing a production environment. To use a
// non-production environment, please use the CLI.
process.env.NODE_ENV = "production";

require("./server")();
