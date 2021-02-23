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
      .findOne({ _id: ObjectId(req.query.thread_id) });

    if (!threadObject) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No thread exists for the provided `thread_id`"
        )
      );
      return res.status(404).json(error);
    }
    var hasAccess = threadObject.thread_participants.some(function (
      participantId
    ) {
      return participantId.equals(ObjectId(loggedInUserId));
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
    if (!tabObject)
      return res.status(200).json({
        status: 200,
        message: "No tabs to retrieve.",
        result: [],
      });

    tabObject.forEach((tab, index) => {
      let isSecured = tab.secured_for.some(function (participantId) {
        return participantId.equals(loggedInUserId);
      });
      tabObject[index].is_secured = isSecured;
      delete tabObject[index].secured_for;
    });

    return res.status(200).json({
      status: 200,
      message: "Tabs Retrieved.",
      result: tabObject,
    });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
