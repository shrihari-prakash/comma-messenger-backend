("use strict");

const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/.env" });

const http = require("http");
const app = require("./apiServer.js");
const port = process.env.PORT || 26398;
const server = (exports.server = http.createServer(app));
const socketMiddleware = require("./socket/v1/middleware");
const path = require("path");

["debug", "log", "warn", "error"].forEach((methodName) => {
  const originalLoggingMethod = console[methodName];
  console[methodName] = (firstArgument, ...otherArguments) => {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const callee = new Error().stack[1];
    Error.prepareStackTrace = originalPrepareStackTrace;
    const relativeFileName = path.relative(process.cwd(), callee.getFileName());
    const prefix = `${relativeFileName}:${callee.getLineNumber()}:`;
    if (typeof firstArgument === "string") {
      originalLoggingMethod(prefix + " " + firstArgument, ...otherArguments);
    } else {
      originalLoggingMethod(prefix, firstArgument, ...otherArguments);
    }
  };
});

//We've got both express and socket.io listening on a similar kind of path structure to maintain consistency in api architecture
const io = require("socket.io")(server, { path: "/api/socket/communicate/" });
socketMiddleware.socketHandler(io);
var connectionMap = socketMiddleware.connectionMap;
app.set("connectionMap", connectionMap);

server.listen(port);
console.log(`Comma APIs runnning at ${process.env.PORT || 26398}`);
