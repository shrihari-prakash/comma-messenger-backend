const tokenMgr = require("../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cache = require("../../utils/cacheManager");
const cacheManager = new cache.cacheManager();

cacheManager.init();

const mongoConnector = require("../../utils/dbUtils/mongoConnector");
var ObjectId = require("mongodb").ObjectID;

var db = null;
mongoConnector.connectToServer(function (err, client) {
  if (err) console.log(err);
  db = mongoConnector.getDb();
});

//This will be a humongous map of all the online clients connected to the system.
//Fun fact: the word mongo comes from the word humongous!
var connectionMap = {};

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    socket.on("_connect", async (initObject) => {
      let loggedInUserId = await verifyUser(initObject.token);

      if (loggedInUserId != false) {
        console.log("connected: " + loggedInUserId);
        socket.id = loggedInUserId;
        connectionMap[socket.id] = socket;
      } else {
        console.log("Unauthenticated user.");
        socket.disconnect();
        socket.conn.close();
      }
    });

    socket.on("_messageOut", async (message) => {
      let loggedInUserId = await verifyUser(message.token, socket);

      if (loggedInUserId != false) {
        let messageId = message.id;

        verifyAndInsertMessage(message, socket).then((isSuccess) => {
          console.log(isSuccess);
          if (isSuccess === true)
            socket.emit("_success", { message_id: messageId });
          else socket.emit("_error", { message_id: messageId });
        });
      }
    });

    socket.on("disconnect", (message) => {
      delete connectionMap[socket.id];
    });
  });
};

async function verifyUser(authToken) {
  if (!authToken) return false;

  authToken = authToken.slice(7, authToken.length).trimLeft();

  let loggerInUser = await tokenManager.verify(db, authToken, cacheManager);
  console.log(loggerInUser);
  if (!loggerInUser) return false;

  return loggerInUser.user_id;
}

async function verifyAndInsertMessage(message, socket) {
  return new Promise(function (resolve, reject) {
    db.collection("threads").findOne(
      { tabs: { $in: [ObjectId(message.tab_id)] } },
      function (err, threadObject) {
        if (err) resolve(false);

        //Make sure some random user is not sending messages to a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(socket.id);
        });

        if (hasAccess) {
          db.collection("tabs").updateOne(
            { _id: ObjectId(message.tab_id) },
            { $push: { messages: message.content } },
            function (err, result) {
              if (err) throw err;

              //If the user is online send it to the respective socket.
              if (connectionMap[message.receiver_id])
                connectionMap[message.receiver_id].emit("_messageIn", {
                  message: message.content,
                });
              resolve(true);
            }
          );
        } else resolve(false);
      }
    );
  });
}

module.exports = socketHandler;
