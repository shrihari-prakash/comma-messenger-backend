const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  if (!req.query.thread_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `thread_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  try {
    var threadObject = await db
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
            as: "thread_participants",
          },
        },
      ])
      .toArray();

    if (!threadObject.length > 0) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No thread exists for the provided `thread_id`"
        )
      );
      return res.status(404).json(error);
    }

    threadObject = threadObject[0];

    var hasAccess = threadObject.thread_participants.some(function (
      participant
    ) {
      console.log(participant);
      return participant._id.equals(ObjectId(loggedInUserId));
    });

    if (!hasAccess) {
      let error = new errorModel.errorResponse(errors.invalid_key);
      return res.status(403).json(error);
    }

    var tabObject = await db
      .collection("tabs")
      .find({
        _id: { $in: threadObject.tabs },
      })
      .project({ messages: 0, password: 0 }) //Make sure we don't send all the messages that a tab has since this endpoint should just fetch a list of all tabs.
      .toArray();

    tabObject.forEach((tab, index) => {
      let isSecured = tab.secured_for.some(function (participantId) {
        return participantId.equals(loggedInUserId);
      });
      tabObject[index].is_secured = isSecured;
      delete tabObject[index].secured_for;
    });

    threadObject.tabs = tabObject ? tabObject : [];

    return res.status(200).json({
      status: 200,
      message: "Thread Info Retrieved.",
      result: threadObject,
    });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
