const bcrypt = require("bcrypt");

const cryptUtil = require("../../utils/crypt");
const crypt = new cryptUtil.crypt();

var ObjectId = require("mongodb").ObjectID;

module.exports = {
  sendMessage: function (
    db,
    push,
    socket,
    message,
    connectionMap,
    userAuthResult
  ) {
    return new Promise(async function (resolve, reject) {
      var isHardFail = true;
      try {
        if (!message.payload) return reject({ ok: 0, reason: "EMPTY_PAYLOAD" });

        var userObject = await db
          .collection("users")
          .findOne({ _id: ObjectId(userAuthResult) });

        if (typeof userObject != "object") {
          return reject({ ok: 0, reason: "INVALID_USER" });
        }

        console.log("New message exchange initiated by:", userObject._id);

        let dbPassword = userObject.tab_password;

        var threadObject = await db
          .collection("threads")
          .findOne({ tabs: { $in: [ObjectId(message.payload.tab_id)] } });

        //Make sure some random user is not sending messages to a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(userAuthResult);
        });

        var tabObject = await db
          .collection("tabs")
          .findOne({ _id: ObjectId(message.payload.tab_id) });

        var isTabSecured = tabObject.secured_for.some(function (participantId) {
          return participantId.equals(socket.userId);
        });
        if (isTabSecured == true) {
          if (dbPassword != null) {
            if (!message.payload.password) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }

            let passwordVerified = bcrypt.compareSync(
              message.payload.password,
              dbPassword
            );
            if (passwordVerified !== true) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }
          }
        }

        if (hasAccess) {
          if (!["text", "image"].includes(message.payload.type))
            return reject({ ok: 0, reason: "INVALID_CONTENT_TYPE" });

          let messageObject = {
            sender: ObjectId(socket.userId),
            type: message.payload.type,
            date_created: new Date(),
            tab_id: ObjectId(message.payload.tab_id),
          };

          switch (message.payload.type) {
            case "text":
              if (!message.payload.content)
                return reject({ ok: 0, reason: "EMPTY_MESSAGE_CONTENT" });
              messageObject.content = crypt.encrypt(message.payload.content);
              break;

            case "image":
              if (!message.payload.file_name)
                return reject({ ok: 0, reason: "EMPTY_FILE_NAME" });
              messageObject.file_name = message.payload.file_name;
              break;

            default:
              break;
          }

          //Update the thread modified time so that while getting the list of threads we can sort by last active thread.
          var threadUpdateResult = await db
            .collection("threads")
            .updateOne(
              { _id: ObjectId(threadObject._id) },
              { $set: { date_updated: new Date() } }
            );

          if (threadUpdateResult.result.ok != 1) {
            return reject({ ok: 0, reason: "DATABASE_WRITE_ERROR" });
          }

          //If any user of the thread is online send it to the respective socket else push it into their unread.
          let newForArray = [];
          threadObject.thread_participants.forEach((receiverId) => {
            if (!receiverId.equals(socket.userId)) newForArray.push(receiverId);
          });

          var messagesInsertResult = await db
            .collection("messages")
            .insertOne(messageObject, {
              w: 1,
            });

          if (messagesInsertResult.result.ok != 1) {
            return reject({ ok: 0, reason: "DATABASE_WRITE_ERROR" });
          }

          isHardFail = false;

          //From this point, any failure doesn't really count as a message not sent since the message is written to the Database and
          //the user is guaranteed to recieve that message when getMessages API is hit.
          messageObject.thread_id = threadObject._id;
          messageObject.tab_id = message.payload.tab_id;
          messageObject.content = message.payload.content;

          threadObject.thread_participants.forEach((receiverId) => {
            if (Array.isArray(connectionMap[receiverId]))
              connectionMap[receiverId].forEach((socketConnection) => {
                if (socketConnection.id !== socket.id)
                  socketConnection.emit("_messageIn", messageObject);
              });
          });

          db.collection("threads").updateOne(
            { _id: ObjectId(threadObject._id) },
            { $addToSet: { new_for: { $each: newForArray } } } //Mark thread as having unread message for participants if it is not already having an unread status.
          );

          db.collection("tabs").updateOne(
            { _id: ObjectId(tabObject._id) },
            { $addToSet: { new_for: { $each: newForArray } } } //Mark tab as having unread message for participants if it is not already having an unread status.
          );

          //Mark message as seen since he is the one sending the message.
          await db.collection("tabs").updateOne(
            {
              _id: ObjectId(tabObject._id),
              "seen_status.user_id": ObjectId(userAuthResult),
            },
            {
              $set: {
                "seen_status.$.last_read_message_id": ObjectId(
                  messageObject._id
                ),
              },
              $pull: {
                new_for: { $in: [ObjectId(userAuthResult)] },
              },
            }
          );

          //Send notification to all the participants except the one who sent the message.
          let participants = await db
            .collection("users")
            .find({ _id: { $in: threadObject.thread_participants } });

          let notificationObject = {
            event: "message_in",
            payload: {
              tab_name: tabObject.tab_name,
              type: message.payload.type,
              sender: socket.userId,
              content: messageObject.content || "Sent an image",
              icon: userObject.display_picture,
            },
          };

          participants.forEach((participant) => {
            console.log(
              participant._id,
              userAuthResult,
              participant._id.equals(userAuthResult)
            );
            if (
              participant.notification_subscriptions &&
              !participant._id.equals(userAuthResult)
            ) {
              participant.notification_subscriptions.forEach(async (subscription) => {
                console.log(subscription);

                const tokenObject = await db
                .collection("tokens")
                .find({ _id: subscription.token_id })
                .toArray();

                if (tokenObject.date_expiry < new Date()) return;

                try {
                  push.sendNotification(
                    subscription.subscription,
                    JSON.stringify(notificationObject)
                  );
                } catch (e) {
                  console.log("Push notification error:", e);
                }
              });
            }
          });
          resolve({
            ok: 1,
            inserted_id: messageObject._id,
            type: messageObject.type,
          });
        } else return reject({ ok: 0, reason: "NO_ACCESS" });
      } catch (e) {
        console.log(e);
        return reject({
          ok: 0,
          reason: "INTERNAL_SERVER_ERROR",
          is_hard_fail: isHardFail,
        });
      }
    });
  },
};
