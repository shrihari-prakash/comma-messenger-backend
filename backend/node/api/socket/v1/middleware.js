const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("a user connected");
    //Sending an object when emmiting an event
    socket.emit("testEvent", {
      description: "Test event recieved!",
    });
  });
};

module.exports = socketHandler;
