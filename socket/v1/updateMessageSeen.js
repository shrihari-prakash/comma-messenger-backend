const { ObjectId } = require("mongodb");
const response = require("./response");

module.exports = async function (
  db,
  socket,
  connectionMap,
  seenStatus,
  userAuthResult
) {
  const event = "_updateMessageSeen";
  try {
    if (!seenStatus.payload)
      return response.error(socket, event, "EMPTY_PAYLOAD", {
        message_id: seenStatus.last_read_message_id,
      });

    if (!seenStatus.payload.last_read_message_id) {
      return response.error(socket, event, "LAST_READ_MESSAGE_NOT_MARKED", {
        message_id: seenStatus.last_read_message_id,
      });
    }
    var userObject = await db
      .collection("users")
      .findOne({ _id: ObjectId(userAuthResult) });

    if (typeof userObject != "object") {
      return response.error(socket, event, "INVALID_USER", {
        message_id: seenStatus.last_read_message_id,
      });
    }

    var threadObject = await db.collection("threads").findOne({
      _id: ObjectId(seenStatus.payload.thread_id),
    });

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
        return response.error(socket, event, "DATABASE_WRITE_ERROR", {
          message_id: seenStatus.last_read_message_id,
        });
      }
      response.success(socket, event);

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
    } else
      return response.error(socket, event, "NO_ACCESS", {
        message_id: seenStatus.last_read_message_id,
      });
  } catch (e) {
    console.log(e);
    return response.error(socket, event, "INTERNAL_SERVER_ERROR", {
      message_id: seenStatus.last_read_message_id,
    });
  }
};
