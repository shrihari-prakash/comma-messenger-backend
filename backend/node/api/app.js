const http = require("http");
const app = require("./apiServer.js");

const port = process.env.PORT || 26398;

const server = http.createServer(app);

console.log(`Comma APIs runnning at ${process.env.PORT || 26398}`);

server.listen(port);
