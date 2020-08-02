const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
  if (!req.header("authorization")) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let authToken = req
    .header("authorization")
    .slice(7, req.header("authorization").length)
    .trimLeft();

  if (!authToken) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let cacheManager = req.app.get("cacheManager");

  let db = req.app.get("mongoInstance");

  let loggedInUserId = await tokenManager.verify(db, authToken, cacheManager);

  if (!loggedInUserId) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  if (!req.query.thread_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `thread_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  try {
    db.collection("threads").findOne(
      { _id: ObjectId(req.query.thread_id) },
      function (err, threadObject) {
        if (err) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.json(error);
        }
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

        db.collection("tabs")
          .find({
            _id: { $in: threadObject.tabs },
          })
          .project({ messages: 0, password: 0 }) //Make sure we don't send all the messages that a tab has since this endpoint should just fetch a list of all tabs.
          .toArray(function (err, tabObject) {
            if (!tabObject)
              return res.status(200).json({
                status: 200,
                message: "No tabs to retrieve.",
                result: [],
              });
            return res.status(200).json({
              status: 200,
              message: "Tabs Retrieved.",
              result: tabObject,
            });
          });
      }
    );
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

module.exports = router;
