var connectionMap = {};
const socketHandler = (io) => {
  io.on("connection", (socket) => {
    socket.on("_connect", (id) => {
      console.log("connected: " + id.id);
      socket.id = id.id;
      connectionMap[socket.id] = socket;
    });

    socket.on("_messageOut", (message) => {
      console.log(message)
      connectionMap[message.receiver_id].emit("_messageIn", {
        message: message.content,
      });
    });

    socket.on("disconnect", (message) => {
      delete connectionMap[socket.id];
    });
  });
};

module.exports = socketHandler;
