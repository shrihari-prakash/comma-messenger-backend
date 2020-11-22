const bcrypt = require("bcrypt");
const push = require("web-push");

const tokenMgr = require("../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cache = require("../../utils/cacheManager");
const cacheManager = new cache.cacheManager();

const sender = require("./sendMessage");
const updateMessageSeen = require("./updateMessageSeen");
const updateTypingStatus = require("./updateTypingStatus");

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
      if (checkHeaders(initObject) === false)
        return socket.emit("_connect", {
          ok: 0,
          reason: "INVALID_USER",
        });

      let userAuthResult = await verifyUser(
        initObject.headers.token,
        initObject.headers.user_id
      );

      if (userAuthResult.ok != 0) {
        console.log("User", userAuthResult.data, "is online.");
        socket.userId = userAuthResult.data;

        Array.isArray(connectionMap[socket.userId])
          ? connectionMap[socket.userId].push(socket)
          : (connectionMap[socket.userId] = [socket]);

        socket.emit("_connect", {
          ok: 1,
        });
      } else {
        console.log("Unauthenticated user.");
        socket.emit("_connect", {
          ok: 0,
          reason: "INVALID_USER",
        });
        socket.disconnect();
        socket.conn.close();
      }
    });

    socket.on("_messageOut", async (message) => {
      if (checkHeaders(message) === false)
        return socket.emit("_messageOut", {
          ok: 0,
          reason: "INVALID_USER",
        });

      let userAuthResult = await verifyUser(
        message.headers.token,
        message.headers.user_id
      );
      let messageId = message.payload.id;

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
                type: result.type,
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
      if (checkHeaders(seenStatus) === false)
        return socket.emit("_connect", {
          ok: 0,
          reason: "INVALID_USER",
        });

      let userAuthResult = await verifyUser(
        seenStatus.headers.token,
        seenStatus.headers.user_id
      );

      if (userAuthResult.ok != 0) {
        console.log(
          "User",
          userAuthResult.data,
          "is trying to update read status."
        );
        updateMessageSeen
          .updateMessageSeen(
            db,
            socket,
            connectionMap,
            seenStatus,
            userAuthResult.data
          )
          .then((result) => {
            if (result.ok === 1) {
              socket.emit("_success", {
                ok: 1,
                event: "_updateMessageSeen",
                message_id: seenStatus.last_read_message_id,
              });
            } else {
              socket.emit("_error", {
                ok: 0,
                event: "_updateMessageSeen",
                reason: result.reason,
              });
            }
          })
          .catch(function (rej) {
            socket.emit("_error", {
              ok: 0,
              event: "_updateMessageSeen",
              reason: rej.reason,
            });
            console.log(rej);
          });
      } else {
        socket.emit("_error", {
          ok: 0,
          event: "_updateMessageSeen",
          reason: userAuthResult.reason,
        });
      }
    });

    socket.on("_updateTypingStatus", async (typingStatus) => {
      if (checkHeaders(typingStatus) === false)
        return socket.emit("_updateTypingStatus", {
          ok: 0,
          reason: "INVALID_USER",
        });

      let userAuthResult = await verifyUser(
        typingStatus.headers.token,
        typingStatus.headers.user_id
      );

      if (userAuthResult.ok != 0) {
        console.log(
          "User",
          userAuthResult.data,
          "is trying to update typing status."
        );
        updateTypingStatus
          .updateTypingStatus(
            db,
            socket,
            connectionMap,
            typingStatus,
            userAuthResult.data
          )
          .then((result) => {
            if (result.ok === 1) {
              socket.emit("_success", {
                ok: 1,
                event: "_updateTypingStatus",
                message_id: typingStatus.status,
              });
            } else {
              socket.emit("_error", {
                ok: 0,
                event: "_updateTypingStatus",
                reason: result.reason,
              });
            }
          })
          .catch(function (rej) {
            socket.emit("_error", {
              ok: 0,
              event: "_updateTypingStatus",
              reason: rej.reason,
            });
            console.log(rej);
          });
      } else {
        socket.emit("_error", {
          ok: 0,
          event: "_updateTypingStatus",
          reason: userAuthResult.reason,
        });
      }
    });

    socket.on("disconnect", (message) => {
      console.log("User", socket.userId, "has disconnected.");

      if (Array.isArray(connectionMap[socket.userId]))
        connectionMap[socket.userId] = connectionMap[socket.userId].filter(
          (socketConnection) => socketConnection.id !== socket.id
        );
    });
  });
};

async function verifyUser(authToken, userId) {
  if (!authToken) return { ok: 0, reason: "INVALID_API_KEY" };

  authToken = authToken.slice(7, authToken.length).trimLeft();

  let loggedInUserId = await tokenManager.verify(
    db,
    userId,
    authToken,
    cacheManager
  );
  console.log(loggedInUserId);
  if (!loggedInUserId) return { ok: 0, reason: "INVALID_API_KEY" };

  return { ok: 1, data: loggedInUserId };
}

function checkHeaders(request) {
  console.log(request);
  if (
    !request ||
    !request.headers ||
    !request.headers.token ||
    !request.headers.user_id
  )
    return false;
  return true;
}

module.exports = { socketHandler: socketHandler, connectionMap: connectionMap };
