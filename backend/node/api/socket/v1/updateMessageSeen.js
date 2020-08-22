const bcrypt = require("bcrypt");

const cryptUtil = require("../../utils/crypt");
const { ObjectId } = require("mongodb");
const crypt = new cryptUtil.crypt();

module.exports = {
  updateMessageSeen: function (db, socket, connectionMap, seenStatus, userAuthResult) {
    return new Promise(async function (resolve, reject) {
      try {
        if (!seenStatus.last_read_message_id) {
          reject({ ok: 0, reason: "LAST_READ_MESSAGE_NOT_MARKED" });
        }
        var userObject = await db
          .collection("users")
          .findOne({ _id: ObjectId(userAuthResult) });

        if (typeof userObject != "object") {
          return reject({ ok: 0, reason: "INVALID_USER" });
        }

        let dbPassword = userObject.tab_password;

        var threadObject = await db
          .collection("threads")
          .findOne({ tabs: { $in: [ObjectId(seenStatus.tab_id)] } });

        //Make sure some random user is not sending messages to a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(userAuthResult);
        });

        var tabObject = await db
          .collection("tabs")
          .findOne({ _id: ObjectId(seenStatus.tab_id) });

        var isTabSecured = tabObject.secured_for.some(function (participantId) {
          return participantId.equals(socket.userId);
        });
        if (isTabSecured == true) {
          if (dbPassword != null) {
            if (!seenStatus.password) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }

            let passwordVerified = bcrypt.compareSync(
              seenStatus.password,
              dbPassword
            );
            if (passwordVerified !== true) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }
          }
        }

        if (hasAccess) {
          var tabUpdateResult = await db.collection("tabs").updateOne(
            {
              _id: ObjectId(seenStatus.tab_id),
              "seen_status.user_id": ObjectId(userAuthResult),
            },
            {
              $set: {
                "seen_status.$.last_read_message_id": ObjectId(
                  seenStatus.last_read_message_id
                ),
              },
            }
          );

          if (tabUpdateResult.result.ok != 1) {
            return reject({ ok: 0, reason: "DATABASE_WRITE_ERROR" });
          }
          resolve({ ok: 1 });

          emitObject = {
            tab_id: seenStatus.tab_id,
            thread_id: threadObject._id,
            last_read_message_id: seenStatus.last_read_message_id,
          };

          threadObject.thread_participants.forEach((receiverId) => {
            if (connectionMap[receiverId] && !receiverId.equals(socket.userId))
              connectionMap[receiverId].emit("_messageSeen", emitObject);
          });

        } else return reject({ ok: 0, reason: "NO_ACCESS" });
      } catch (e) {
        console.log(e);
        return reject({
          ok: 0,
          reason: "INTERNAL_SERVER_ERROR",
        });
      }
    });
  },
};
