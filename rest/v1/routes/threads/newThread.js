const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  createThread(req, res);
});

async function createThread(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  if (!req.query.email || !validateEmail(req.query.email)) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `email` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  userManager.checkExistingUser(db, req.query.email).then(async (receiver) => {
    if (typeof receiver === "boolean" && receiver === false) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No recipient found for the provided email"
        )
      );
      return res.status(404).json(error);
    } else {
      if (ObjectId(loggedInUserId).equals(receiver._id)) {
        let error = new errorModel.errorResponse(errors.self_add);
        return res.status(400).json(error);
      }

      var existingThread = await db.collection("threads").findOne({
        thread_participants: {
          $all: [ObjectId(loggedInUserId), receiver._id],
        },
      });

      if (existingThread) {
        let error = new errorModel.errorResponse(
          errors.duplicate_entity.withDetails(
            "User has already started conversation with the given recepient."
          )
        );
        return res.status(400).json(error);
      }

      let threadParticipants = [ObjectId(loggedInUserId), receiver._id];

      let threadObject = {
        thread_participants: threadParticipants,
        new_for: [],
        seen_status: [],
        message_preview: {
          sent_by: null,
          content: null,
        },
        date_created: new Date(),
        date_updated: new Date(),
      };

      threadParticipants.forEach((participantId) => {
        threadObject.seen_status.push({
          user_id: participantId, //Already of type ObjectId.
          last_read_message_id: null,
        });
      });

      try {
        //Insert into threads and push the inserted thread _id into array of threads in users.
        var threadInsertResult = await db
          .collection("threads")
          .insertOne(threadObject, { w: 1 });

        if (threadInsertResult.result.ok != 1) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.status(500).json(error);
        }

        let insertedThreadId = threadObject._id;

        var userUpdateResult = await db
          .collection("users")
          .updateMany(
            { _id: { $in: [ObjectId(loggedInUserId), receiver._id] } },
            { $push: { threads: insertedThreadId } }
          );

        if (userUpdateResult.result.ok != 1) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.status(500).json(error);
        }

        //No need to check for null or false because this user is guaranteed to exist since he is the once logged in.
        let sender = await userManager.getUserById(
          db,
          ObjectId(loggedInUserId)
        );

        deleteSensitiveData(sender);
        deleteSensitiveData(receiver);

        threadObject.thread_participants[0] = sender;
        threadObject.thread_participants[1] = receiver;

        //Send newly created thread to other member if they are online.
        let connectionMap = req.app.get("connectionMap");
        if (
          Array.isArray(connectionMap[receiver._id]) &&
          !receiver._id.equals(loggedInUserId)
        )
          connectionMap[receiver._id].forEach((socketConnection) => {
            socketConnection.emit("_newThread", threadObject);
          });

        return res.status(200).json({
          status: 200,
          message: "Thread created.",
          result: threadObject,
        });
      } catch (e) {
        console.log(e);
        let error = new errorModel.errorResponse(errors.internal_error);
        return res.status(500).json(error);
      }
    }
  });
}

function validateEmail(email) {
  const re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function deleteSensitiveData(user) {
  delete user.tab_password;
  delete user.master_password;
  delete user.threads;
  return true;
}

module.exports = router;
