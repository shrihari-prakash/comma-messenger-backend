const dotenv = require("dotenv");
dotenv.config({ path: __dirname + "/.env" });

const http = require("http");
const app = require("./apiServer.js");
const port = process.env.PORT || 26398;
const server = (exports.server = http.createServer(app));
const socketMiddleware = require("./socket/v1/middleware");

//We've got both express and socket.io listening on a similar kind of path structure to maintain consistency in api architecture
const io = require("socket.io")(server, { path: "/api/socket/communicate/" });
socketMiddleware.socketHandler(io);
var connectionMap = socketMiddleware.connectionMap;
app.set("connectionMap", connectionMap);

server.listen(port);
console.log(`Comma APIs runnning at ${process.env.PORT || 26398}`);
