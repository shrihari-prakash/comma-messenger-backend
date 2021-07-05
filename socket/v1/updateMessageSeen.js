const { ObjectId } = require("mongodb");

module.exports = {
  updateMessageSeen: function (db, connectionMap, seenStatus, userAuthResult) {
    return new Promise(async function (resolve, reject) {
      try {
        if (!seenStatus.payload)
          return reject({ ok: 0, reason: "EMPTY_PAYLOAD" });

        if (!seenStatus.payload.last_read_message_id) {
          reject({ ok: 0, reason: "LAST_READ_MESSAGE_NOT_MARKED" });
        }
        var userObject = await db
          .collection("users")
          .findOne({ _id: ObjectId(userAuthResult) });

        if (typeof userObject != "object") {
          return reject({ ok: 0, reason: "INVALID_USER" });
        }

        var threadObject = await db
          .collection("threads")
          .findOne({ _id: { $in: [ObjectId(seenStatus.payload.thread_id)] } });

        //Make sure some random user is not trying to update seen status on a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(userAuthResult);
        });

        if (hasAccess) {
          //Remove new_for tag for current user when messages are read.
          var threadUpdateResult = await db.collection("threads").updateOne(
            {
              _id: ObjectId(seenStatus.payload.thread_id),
              "seen_status.user_id": ObjectId(userAuthResult),
            },
            {
              $set: {
                "seen_status.$.last_read_message_id": ObjectId(
                  seenStatus.payload.last_read_message_id
                ),
              },
              $pull: {
                new_for: { $in: [ObjectId(userAuthResult)] },
              },
            }
          );

          if (threadUpdateResult.result.ok != 1) {
            return reject({ ok: 0, reason: "DATABASE_WRITE_ERROR" });
          }
          resolve({ ok: 1 });

          let emitObject = {
            thread_id: seenStatus.payload.thread_id,
            last_read_message_id: seenStatus.payload.last_read_message_id,
          };

          threadObject.thread_participants.forEach((receiverId) => {
            if (
              Array.isArray(connectionMap[receiverId]) &&
              !receiverId.equals(userObject._id)
            )
              connectionMap[receiverId].forEach((socketConnection) => {
                socketConnection.emit("_messageSeen", emitObject);
              });
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
