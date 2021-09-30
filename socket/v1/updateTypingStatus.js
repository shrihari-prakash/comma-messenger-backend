const { ObjectId } = require("mongodb");
const response = require("./response");

module.exports = async function (
  db,
  socket,
  connectionMap,
  typingStatus,
  userAuthResult
) {
  const event = "_updateTypingStatus";
  try {
    if (!typingStatus.payload)
      return response.error(socket, event, "EMPTY_PAYLOAD");

    if (
      typingStatus.payload.status === null ||
      typeof typingStatus.payload.status === "undefined"
    ) {
      return response.error(socket, event, "TYPING_STATUS_NOT_MARKED");
    }
    var userObject = await db
      .collection("users")
      .findOne({ _id: ObjectId(userAuthResult) });

    if (typeof userObject != "object") {
      return response.error(socket, event, "INVALID_USER");
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
    } else return response.error(socket, event, "NO_ACCESS");
  } catch (e) {
    console.log(e);
    return response.error(socket, event, "INTERNAL_SERVER_ERROR");
  }
};
