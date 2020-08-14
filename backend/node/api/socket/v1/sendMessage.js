const bcrypt = require("bcrypt");

const cryptUtil = require("../../utils/crypt");
const crypt = new cryptUtil.crypt();

var ObjectId = require("mongodb").ObjectID;

module.exports = {
  sendMessage: function (db, push, socket, message, connectionMap, userAuthResult) {
    return new Promise(async function (resolve, reject) {
      try {
        var userObject = await db
          .collection("users")
          .findOne({ _id: ObjectId(userAuthResult) });

        console.log("New message exchange initiated by:", userObject._id);

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

        var isTabSecured = tabObject.secured_for.some(function (participantId) {
          return participantId.equals(socket.id);
        });
        if (isTabSecured == true) {
          if (dbPassword != null) {
            if (!message.password) {
              reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }

            let passwordVerified = bcrypt.compareSync(
              message.password,
              dbPassword
            );
            if (passwordVerified !== true) {
              reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }
          }
        }

        if (hasAccess) {
          if (!["text", "image"].includes(message.type))
            reject({ ok: 0, reason: "INVALID_CONTENT_TYPE" });

          let messageObject = {
            sender: ObjectId(socket.id),
            type: message.type,
            date_created: new Date(),
          };

          switch (message.type) {
            case "text":
              if (!message.content)
                reject({ ok: 0, reason: "EMPTY_MESSAGE_CONTENT" });
              messageObject.content = crypt.encrypt(message.content);
              break;

            case "image":
              if (!message.file_name)
                reject({ ok: 0, reason: "EMPTY_FILE_NAME" });
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

          let participants = await db
            .collection("users")
            .find({ _id: { $in: threadObject.thread_participants } });
          let notificationPayload = {
            title: "New Message on " + tabObject.tab_name,
            description:
              userObject.name.givenName +
              ": " +
              (messageObject.content || "Sent an image"),
            icon: userObject.display_picture,
          };

          participants.forEach((participant) => {
            if (
              participant.notification_subscriptions &&
              participant._id != ObjectId(userAuthResult)
            ) {
              participant.notification_subscriptions.forEach((subscription) => {
                push.sendNotification(
                  subscription,
                  JSON.stringify(notificationPayload)
                );
              });
            }
          });
          resolve({ ok: 1 });
        } else reject({ ok: 0, reason: "NO_ACCESS" });
      } catch (e) {
        console.log(e);
        reject({ ok: 0, reason: "INTERNAL_SERVER_ERROR" });
      }
    });
  },
};
