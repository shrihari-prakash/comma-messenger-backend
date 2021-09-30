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
const response = require("./response");

var db = null;
mongoConnector.connectToServer(function (err, client) {
  if (err) console.error(err);
  db = mongoConnector.getDb();
});

//This will be a humongous map of all the online clients connected to the system.
//Fun fact: the word mongo comes from the word humongous!
var connectionMap = {};

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    //Authorize and add user to memory.
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

    //Outgoing message
    socket.on("_messageOut", async (message) => {
      const event = "_messageOut";
      const messageId = message.payload.id;
      const authResult = await preHandler(socket, event, message, {
        is_hard_fail: true,
        message_id: messageId,
      });

      if (authResult === false) return;

      sender.sendMessage(
        db,
        push,
        socket,
        message,
        connectionMap,
        authResult.data
      );
    });

    //Outgoing seen status
    socket.on("_updateMessageSeen", async (seenStatus) => {
      const event = "_updateMessageSeen";
      const authResult = await preHandler(socket, event, seenStatus);

      if (authResult === false) return;

      console.log("User", authResult.data, "is trying to update read status.");

      updateMessageSeen.updateMessageSeen(
        db,
        socket,
        connectionMap,
        seenStatus,
        authResult.data
      );
    });

    //Outgoing typing status
    socket.on("_updateTypingStatus", async (typingStatus) => {
      const event = "_updateTypingStatus";
      const authResult = await preHandler(socket, event, typingStatus);

      if (authResult === false) return;

      console.log("User", authResult.data, "is changing typing status.");

      await updateTypingStatus.updateTypingStatus(
        db,
        socket,
        connectionMap,
        typingStatus,
        authResult.data
      );
    });

    socket.on("disconnect", () => {
      console.log("User", socket.userId, "has disconnected.");

      if (Array.isArray(connectionMap[socket.userId]))
        connectionMap[socket.userId] = connectionMap[socket.userId].filter(
          (socketConnection) => socketConnection.id !== socket.id
        );
    });
  });
};

async function preHandler(socket, event, message, additionalPayload = {}) {
  if (checkHeaders(message) === false) {
    socket.emit(event, {
      ok: 0,
      reason: "INVALID_USER",
      ...additionalPayload,
    });

    return false;
  }

  let userAuthResult = await verifyUser(
    message.headers.token,
    message.headers.user_id
  );

  if (userAuthResult.ok === 0) {
    response.error(socket, event, userAuthResult.reason, additionalPayload);

    return false;
  }

  return userAuthResult;
}

async function verifyUser(authToken, userId) {
  if (!authToken) return { ok: 0, reason: "INVALID_API_KEY" };

  authToken = authToken.slice(7, authToken.length).trimLeft();

  let loggedInUserId = await tokenManager.verify(
    db,
    userId,
    authToken,
    cacheManager
  );

  if (!loggedInUserId) return { ok: 0, reason: "INVALID_API_KEY" };

  return { ok: 1, data: loggedInUserId };
}

function checkHeaders(request) {
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
