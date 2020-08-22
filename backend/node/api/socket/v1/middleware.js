const bcrypt = require("bcrypt");
const push = require("web-push");

const tokenMgr = require("../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cache = require("../../utils/cacheManager");
const cacheManager = new cache.cacheManager();

const sender = require("./sendMessage");
const updateMessageSeen = require("./updateMessageSeen");

//uncomment to generate new vapidKeys.

/* let vapidKeys = push.generateVAPIDKeys();
console.log(vapidKeys); */

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

push.setVapidDetails(
  "mailto:shrihariprakash@outlook.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

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
        console.log("User", userAuthResult.data, "is online.");
        /* socket.id = userAuthResult.data; */
        socket.userId = userAuthResult.data;
        connectionMap[socket.userId] = socket;
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
        sender
          .sendMessage(
            db,
            push,
            socket,
            message,
            connectionMap,
            userAuthResult.data
          )
          .then((result) => {
            if (result.ok === 1) {
              socket.emit("_success", {
                ok: 1,
                event: "_messageOut",
                message_id: messageId,
                inserted_id: result.inserted_id,
              });
            }
          })
          .catch(function (rej) {
            socket.emit("_error", {
              ok: 0,
              event: "_messageOut",
              is_hard_fail: rej.is_hard_fail,
              message_id: messageId,
              reason: rej.reason,
            });
            console.log(rej);
          });
      } else {
        socket.emit("_error", {
          ok: 0,
          event: "_messageOut",
          is_hard_fail: true,
          message_id: messageId,
          reason: userAuthResult.reason,
        });
      }
    });

    socket.on("_updateMessageSeen", async (seenStatus) => {
      let userAuthResult = await verifyUser(seenStatus.token);

      if (userAuthResult.ok != 0) {
        console.log(
          "User",
          userAuthResult.data,
          "is trying to update read status."
        );
        updateMessageSeen
          .updateMessageSeen(db, socket, seenStatus, userAuthResult.data)
          .then((result) => {
            if (result.ok === 1) {
              socket.emit("_success", {
                event: "_updateMessageSeen",
                message_id: seenStatus.last_read_message_id,
                ok: 1,
              });
            } else {
              socket.emit("_error", {
                event: "_updateMessageSeen",
                ok: 0,
                reason: result.reason,
              });
            }
          })
          .catch(function (rej) {
            socket.emit("_error", {
              event: "_updateMessageSeen",
              ok: 0,
              reason: rej.reason,
            });
            console.log(rej);
          });
      } else {
        socket.emit("_error", {
          event: "_updateMessageSeen",
          ok: 0,
          reason: userAuthResult.reason,
        });
      }
    });

    socket.on("disconnect", (message) => {
      console.log("User", socket.userId, "has disconnected.");
      delete connectionMap[socket.userId];
    });
  });
};

async function verifyUser(authToken) {
  if (!authToken) return { ok: 0, reason: "INVALID_API_KEY" };

  authToken = authToken.slice(7, authToken.length).trimLeft();

  let loggedInUserId = await tokenManager.verify(db, authToken, cacheManager);
  if (!loggedInUserId) return { ok: 0, reason: "INVALID_API_KEY" };

  return { ok: 1, data: loggedInUserId };
}

module.exports = socketHandler;
