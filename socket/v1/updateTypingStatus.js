const bcrypt = require("bcrypt");

const cryptUtil = require("../../utils/crypt");
const { ObjectId } = require("mongodb");
const crypt = new cryptUtil.crypt();

module.exports = {
  updateTypingStatus: function (
    db,
    socket,
    connectionMap,
    typingStatus,
    userAuthResult
  ) {
    return new Promise(async function (resolve, reject) {
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

        let dbPassword = userObject.tab_password;

        var threadObject = await db
          .collection("threads")
          .findOne({ tabs: { $in: [ObjectId(typingStatus.payload.tab_id)] } });

        //Make sure some random user is not trying to update seen status on a thread to which he doesn't even belong.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(userAuthResult);
        });

        var tabObject = await db
          .collection("tabs")
          .findOne({ _id: ObjectId(typingStatus.payload.tab_id) });

        var isTabSecured = tabObject.secured_for.some(function (participantId) {
          return participantId.equals(userObject._id);
        });
        if (isTabSecured == true) {
          if (dbPassword != null) {
            if (!typingStatus.payload.password) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }

            let passwordVerified = bcrypt.compareSync(
              typingStatus.payload.password,
              dbPassword
            );
            if (passwordVerified !== true) {
              return reject({ ok: 0, reason: "INVALID_PASSWORD" });
            }
          }
        }

        if (hasAccess) {
          emitObject = {
            tab_id: typingStatus.payload.tab_id,
            thread_id: threadObject._id,
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
    });
  },
};
