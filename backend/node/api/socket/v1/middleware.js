const bcrypt = require("bcrypt");

const tokenMgr = require("../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cache = require("../../utils/cacheManager");
const cacheManager = new cache.cacheManager();

const cryptUtil = require("../../utils/crypt");
const crypt = new cryptUtil.crypt();

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
      let userAuthResult = await verifyUser(initObject.token);

      if (userAuthResult.ok != 0) {
        console.log("connected: " + userAuthResult.data);
        socket.id = userAuthResult.data;
        connectionMap[socket.id] = socket;
      } else {
        console.log("Unauthenticated user.");
        socket.disconnect();
        socket.conn.close();
      }
    });

    socket.on("_messageOut", async (message) => {
      let userAuthResult = await verifyUser(message.token, socket);
      let messageId = message.id;

      if (userAuthResult.ok != 0) {
        verifyAndInsertMessage(message, socket, userAuthResult.data)
          .then((result) => {
            if (result.ok === 1) {
              socket.emit("_success", { message_id: messageId, ok: 1 });
            } else {
              socket.emit("_error", {
                message_id: messageId,
                ok: 0,
                reason: result.reason,
              });
            }
          })
          .catch(function (rej) {
            socket.emit("_error", {
              message_id: messageId,
              ok: 0,
              reason: userAuthResult.reason,
            });
            console.log(rej);
          });
      } else {
        socket.emit("_error", {
          message_id: messageId,
          ok: 0,
          reason: userAuthResult.reason,
        });
      }
    });

    socket.on("disconnect", (message) => {
      delete connectionMap[socket.id];
    });
  });
};

async function verifyUser(authToken) {
  if (!authToken) return { ok: 0, reason: "INVALID_API_KEY" };

  authToken = authToken.slice(7, authToken.length).trimLeft();

  let loggerInUser = await tokenManager.verify(db, authToken, cacheManager);
  if (!loggerInUser) return { ok: 0, reason: "INVALID_API_KEY" };

  return { ok: 1, data: loggerInUser };
}

async function verifyAndInsertMessage(message, socket, userAuthResult) {
  return new Promise(async function (resolve, reject) {
    try {
      var userObject = await db
        .collection("users")
        .findOne({ _id: ObjectId(userAuthResult) });

        console.log(userObject)
      let dbPassword = userObject.tab_password;

      var threadObject = await db
        .collection("threads")
        .findOne({ tabs: { $in: [ObjectId(message.tab_id)] } });

      //Make sure some random user is not sending messages to a thread to which he doesn't even belong.
      var hasAccess = threadObject.thread_participants.some(function (
        participantId
      ) {
        return participantId.equals(socket.id);
      });

      var tabObject = await db
        .collection("tabs")
        .findOne({ _id: ObjectId(message.tab_id) });

      if (tabObject.require_authentication == true) {
        if (!message.password) {
          reject({ ok: 0, reason: "INVALID_PASSWORD" });
        }

        let passwordVerified = bcrypt.compareSync(message.password, dbPassword);
        if (passwordVerified !== true) {
          reject({ ok: 0, reason: "INVALID_PASSWORD" });
        }
      }

      if (hasAccess) {
        if(!["text", "image"].includes(message.type)) reject({ ok: 0, reason: "INVALID_CONTENT_TYPE" });

        let messageObject = {
          sender: ObjectId(socket.id),
          type: message.type,
          date_created: new Date(),
        };

        switch (message.type) {
          case "text":
            if(!message.content) reject({ ok: 0, reason: "EMPTY_MESSAGE_CONTENT" })
            messageObject.content = crypt.encrypt(message.content);
            break;

          case "image":
            if(!message.file_name) reject({ ok: 0, reason: "EMPTY_FILE_NAME" })
            messageObject.file_name = message.file_name;
            break;
        
          default:
            break;
        }

        var tabUpdateResult = await db
          .collection("tabs")
          .updateOne(
            { _id: ObjectId(message.tab_id) },
            { $push: { messages: messageObject } }
          );

        if (tabUpdateResult.result.ok != 1) {
          reject({ ok: 0, reason: "INTERNAL_SERVER_ERROR" });
        }

        messageObject.thread_id = threadObject._id;
        messageObject.tab_id = message.tab_id;

        messageObject.content = message.content;
        //If any user of the thread is online send it to the respective socket.
        threadObject.thread_participants.forEach((receiverId) => {
          if (connectionMap[receiverId] && !receiverId.equals(socket.id))
            connectionMap[receiverId].emit("_messageIn", messageObject);
        });

        resolve({ ok: 1 });
      } else reject({ ok: 0, reason: "NO_ACCESS" });
    } catch (e) {
      console.log(e);
      reject({ ok: 0, reason: "INTERNAL_SERVER_ERROR" });
    }
  });
}

module.exports = socketHandler;
