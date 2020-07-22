const http = require("http");
const app = require("./apiServer.js");
const port = process.env.PORT || 26398;
const server = http.createServer(app);

//We've got both express and socket.io listening on a similar kind of path structure to maintain consistency in api architecture
const io = require('socket.io')(server, {path: '/api/socket/communicate/'});
require("./socket/v1/middleware")(io); 

server.listen(port);
console.log(`Comma APIs runnning at ${process.env.PORT || 26398}`);
