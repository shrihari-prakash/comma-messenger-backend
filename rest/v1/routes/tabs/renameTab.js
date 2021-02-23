const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.put("/", async function (req, res) {
  renameTab(req, res);
});

async function renameTab(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  let tabInfo = req.body;

  if (!tabInfo.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!tabInfo.name) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_name` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  try {
    var threadObject = await db
      .collection("threads")
      .findOne({ tabs: { $in: [ObjectId(tabInfo.tab_id)] } });

    if (!threadObject) {
      let error = new errorModel.errorResponse(
        errors.invalid_input.withDetails(
          "No valid `tab_id` was sent along with the request."
        )
      );
      return res.status(400).json(error);
    }

    var hasAccess = threadObject.thread_participants.some(function (
      participantId
    ) {
      return participantId.equals(loggedInUserId);
    });
    if (!hasAccess) {
      let error = new errorModel.errorResponse(errors.invalid_permission);
      return res.status(401).json(error);
    }

    var tabUpdateResult = await db
      .collection("tabs")
      .updateOne(
        { _id: ObjectId(tabInfo.tab_id) },
        { $set: { tab_name: tabInfo.name } }
      );

    if (tabUpdateResult.result.ok != 1) {
      let error = new errorModel.errorResponse(errors.internal_error);
      return res.status(500).json(error);
    }

    return res.status(200).json({
      status: 200,
      message: "Tab renamed.",
    });
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
