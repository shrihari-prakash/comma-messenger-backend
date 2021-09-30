const { ObjectId } = require("mongodb");
const response = require("./response");

module.exports = async function (
  db,
  socket,
  connectionMap,
  likePayload,
  userAuthResult
) {
  const event = "_updateMessageLike";
  try {
    if (!likePayload.payload)
      return response.error(socket, event, "EMPTY_PAYLOAD", {
        message_id: likePayload.liked_message_id,
      });

    if (!likePayload.payload.liked_message_id) {
      return response.error(socket, event, "LIKED_MESSAGE_NOT_MARKED", {
        message_id: likePayload.liked_message_id,
      });
    }
    var userObject = await db
      .collection("users")
      .findOne({ _id: ObjectId(userAuthResult) });

    if (typeof userObject != "object") {
      return response.error(socket, event, "INVALID_USER", {
        message_id: likePayload.liked_message_id,
      });
    }

    var threadObject = await db.collection("threads").findOne({
      _id: ObjectId(likePayload.payload.thread_id),
    });

    //Make sure some random user is not trying to update seen status on a thread to which he doesn't even belong.
    var hasAccess = threadObject.thread_participants.some(function (
      participantId
    ) {
      return participantId.equals(userAuthResult);
    });

    var messageObject = await db.collection("threads").findOne({
      _id: ObjectId(likePayload.payload.liked_message_id),
    });

    if (!messageObject)
      return response.error(socket, event, "INVALID_MESSAGE_ID", {
        message_id: likePayload.liked_message_id,
      });

    if (messageObject.sent_by.equals(userAuthResult))
      return response.error(socket, event, "CANNOT_LIKE_SELF_MESSAGE", {
        message_id: likePayload.liked_message_id,
      });

    const query = {};
    const subQuery = {
      liked_by: { $in: [ObjectId(userAuthResult)] },
    };

    if (likePayload.payload.status === "like") {
      query.$push = subQuery;
    } else {
      query.$pull = subQuery;
    }

    if (hasAccess) {
      var messageUpdateResult = await db.collection("messages").updateOne({
        _id: ObjectId(likePayload.payload.liked_message_id),
        query,
      });

      if (messageUpdateResult.result.ok != 1) {
        return response.error(socket, event, "DATABASE_WRITE_ERROR", {
          message_id: likePayload.liked_message_id,
        });
      }
      response.success(socket, event);

      let emitObject = {
        thread_id: likePayload.payload.thread_id,
        liked_message_id: likePayload.payload.liked_message_id,
        status: likePayload.payload.status,
      };

      threadObject.thread_participants.forEach((receiverId) => {
        if (
          Array.isArray(connectionMap[receiverId]) &&
          !receiverId.equals(userObject._id)
        )
          connectionMap[receiverId].forEach((socketConnection) => {
            socketConnection.emit(event, emitObject);
          });
      });
    } else
      return response.error(socket, event, "NO_ACCESS", {
        message_id: likePayload.liked_message_id,
      });
  } catch (e) {
    console.log(e);
    return response.error(socket, event, "INTERNAL_SERVER_ERROR", {
      message_id: likePayload.liked_message_id,
    });
  }
};
