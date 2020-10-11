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
          .findOne({ tabs: { $in: [ObjectId(message.tab_id)] } });

        //Make sure some random user is not sending messages to a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(userAuthResult);
        });

        var tabObject = await db
          .collection("tabs")
          .findOne({ _id: ObjectId(message.tab_id) });

        var isTabSecured = tabObject.secured_for.some(function (participantId) {
          return participantId.equals(socket.userId);
        });
        if (isTabSecured == true) {
          if (dbPassword != null) {
            if (!message.password) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }

            let passwordVerified = bcrypt.compareSync(
              message.password,
              dbPassword
            );
            if (passwordVerified !== true) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }
          }
        }

        if (hasAccess) {
          if (!["text", "image"].includes(message.type))
            return reject({ ok: 0, reason: "INVALID_CONTENT_TYPE" });

          let messageObject = {
            _id: new ObjectId(),
            sender: ObjectId(socket.userId),
            type: message.type,
            date_created: new Date(),
          };

          switch (message.type) {
            case "text":
              if (!message.content)
                return reject({ ok: 0, reason: "EMPTY_MESSAGE_CONTENT" });
              messageObject.content = crypt.encrypt(message.content);
              break;

            case "image":
              if (!message.file_name)
                return reject({ ok: 0, reason: "EMPTY_FILE_NAME" });
              messageObject.file_name = message.file_name;
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

          var tabUpdateResult = await db.collection("tabs").updateOne(
            { _id: ObjectId(message.tab_id) },
            {
              $push: { messages: messageObject },
              $addToSet: { new_for: { $each: newForArray } },
            }
          );

          if (tabUpdateResult.result.ok != 1) {
            return reject({ ok: 0, reason: "DATABASE_WRITE_ERROR" });
          }

          isHardFail = false;

          //From this point, any failure doesn't really count as a message not sent since the message is written to the Database and
          //the user is guaranteed to recieve that message when getMessages API is hit.
          messageObject.thread_id = threadObject._id;
          messageObject.tab_id = message.tab_id;
          messageObject.content = message.content;

          threadObject.thread_participants.forEach((receiverId) => {
            if (connectionMap[receiverId] && !receiverId.equals(socket.userId))
              connectionMap[receiverId].emit("_messageIn", messageObject);
          });

          db.collection("threads").updateOne(
            { _id: ObjectId(threadObject._id) },
            { $addToSet: { new_for: { $each: newForArray } } } //Mark tab as having unread message for participants if it is not already having an unread status.
          );

          //Send notification to all the participants except the one who sent the message.
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
                console.log(subscription);
                try {
                  push.sendNotification(
                    subscription.subscription,
                    JSON.stringify(notificationPayload)
                  );
                } catch (e) {
                  console.log("Push notification error:", e);
                }
              });
            }
          });
          resolve({ ok: 1, inserted_id: messageObject._id });
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
