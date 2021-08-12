const { ObjectId } = require("mongodb");

module.exports = {
  updateTypingStatus: function (
    db,
    connectionMap,
    typingStatus,
    userAuthResult
  ) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          if (!typingStatus.payload)
            return reject({ ok: 0, reason: "EMPTY_PAYLOAD" });

          if (
            typingStatus.payload.status === null ||
            typeof typingStatus.payload.status === "undefined"
          ) {
            reject({ ok: 0, reason: "TYPING_STATUS_NOT_MARKED" });
          }
          var userObject = await db
            .collection("users")
            .findOne({ _id: ObjectId(userAuthResult) });

          if (typeof userObject != "object") {
            return reject({ ok: 0, reason: "INVALID_USER" });
          }

          var threadObject = await db.collection("threads").findOne({
            _id: ObjectId(typingStatus.payload.thread_id),
          });

          //Make sure some random user is not trying to update seen status on a thread to which he doesn't even belong.
          var hasAccess = threadObject.thread_participants.some(function (
            participantId
          ) {
            return participantId.equals(userAuthResult);
          });

          if (hasAccess) {
            let emitObject = {
              thread_id: typingStatus.payload.thread_id,
              status: typingStatus.payload.status,
            };

            threadObject.thread_participants.forEach((receiverId) => {
              if (
                Array.isArray(connectionMap[receiverId]) &&
                !receiverId.equals(userObject._id)
              )
                connectionMap[receiverId].forEach((socketConnection) => {
                  socketConnection.emit("_typingStatus", emitObject);
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
      })();
    });
  },
};
