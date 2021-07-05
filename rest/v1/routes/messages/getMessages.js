const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const cryptUtil = require("../../../../utils/crypt");
const crypt = new cryptUtil.crypt();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  if (!req.query.limit || !req.query.offset) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `limit` (or) `offset` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (req.query.password) {
    let password = req.query.password;
    if (isEmptyOrSpaces(password) || password.length < 4) {
      let error = new errorModel.errorResponse(
        errors.invalid_input.withDetails(
          "Provided password does not meet security requirements."
        )
      );
      return res.status(400).json(error);
    }
  }
  //End of input validation.

  //Check if the given tab belongs to any thread.
  try {
    var threadObject;

    if (parseInt(req.query.offset) === 0) {
      threadObject = await db
        .collection("threads")
        .aggregate([
          {
            $match: { _id: ObjectId(req.query.thread_id) },
          },
          {
            $lookup: {
              from: "users",
              let: {
                participants: "$thread_participants",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$participants"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    email: 1,
                    name: 1,
                    display_picture: 1,
                  },
                },
              ],
              as: "thread_participants_info",
            },
          },
        ])
        .toArray();
      threadObject = threadObject[0];
    } else
      threadObject = await db
        .collection("threads")
        .findOne({ _id: { $in: [ObjectId(req.query.thread_id)] } });

    if (!threadObject) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No thread exists for the provided `thread_id`"
        )
      );
      return res.status(404).json(error);
    }
    //Even if the tab does belong to a valid thread, we still need to check if the current user is a part of the thread to which the tab belongs.
    var hasAccess = threadObject.thread_participants.some(function (
      participantId
    ) {
      return participantId.equals(loggedInUserId);
    });

    if (!hasAccess) {
      let error = new errorModel.errorResponse(errors.invalid_permission);
      return res.status(401).json(error);
    }

    var dbMessages = await db
      .collection("messages")
      .aggregate([
        { $match: { thread_id: ObjectId(req.query.thread_id) } },
        { $sort: { date_created: -1 } },
        { $skip: parseInt(req.query.offset) },
        { $limit: parseInt(req.query.limit) },
      ])
      .toArray();

    if (!dbMessages || !dbMessages[0])
      return res.status(200).json({
        status: 200,
        message: "No messages to retrieve.",
        result: {
          threadInfo: threadObject,
          messages: [],
        },
      });

    if (dbMessages.length > 0)
      //After the thread is retrieved successfully, loop through the messages and decrypt everything to send to client.
      dbMessages.forEach((messageObject, index) => {
        if (messageObject.content) {
          let decrypted = crypt.decrypt(messageObject.content);
          dbMessages[index].content = decrypted;
        }
      });

    //Remove new_for tag for current user when messages are read.
    let threadUpdateQuery = {
      $pull: {
        new_for: { $in: [ObjectId(loggedInUserId)] },
      },
    };

    //If user is requesting the most recent set of messages mark the mast message of tab as read.
    /* if (
      parseInt(req.query.offset) === 0 &&
      dbMessages.length > 0 //Make sure messages array is not empty.
    )
      threadUpdateQuery.$set = {
        "seen_status.$.last_read_message_id": ObjectId(dbMessages[0]._id),
      };

    //Remove new_for tag for current user when messages are read.
    await db.collection("threads").updateOne(
      {
        _id: threadObject._id,
      },
      threadUpdateQuery
    ); */

    res.status(200).json({
      status: 200,
      message: "Messages Retrieved.",
      result: {
        threadInfo: threadObject,
        messages: dbMessages,
      },
    });

    //Send seen status to the other member if they are online.
    let emitObject = {
      thread_id: threadObject._id,
      last_read_message_id: dbMessages[0]._id,
    };

    let connectionMap = req.app.get("connectionMap");
    return threadObject.thread_participants.forEach((receiverId) => {
      if (
        Array.isArray(connectionMap[receiverId]) &&
        !receiverId.equals(loggedInUserId)
      )
        connectionMap[receiverId].forEach((socketConnection) => {
          socketConnection.emit("_messageSeen", emitObject);
        });
    });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

module.exports = router;
