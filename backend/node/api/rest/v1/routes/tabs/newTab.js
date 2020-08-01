const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.post("/", async function (req, res) {
  createThread(req, res);
});

async function createThread(req, res) {
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

  let tabDetails = req.body;

  if (!tabDetails.thread_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `thread_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!tabDetails.tab_name) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_name` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  try {
    db.collection("threads").findOne(
      { _id: ObjectId(tabDetails.thread_id) },
      function (err, threadObject) {
        if (err) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.json(error);
        }

        let tabObject = {
          tab_name: tabDetails.tab_name,
          thread_id: ObjectId(tabDetails.thread_id),
          messages: [],
          date_created: new Date(),
        };
        //Insert into tabs and push the inserted tab _id into array of tabs in threads.
        db.collection("tabs").insertOne(tabObject, { w: 1 }, function (
          err,
          result
        ) {
          if (err) throw err;
          let insertedTabId = tabObject._id;
          db.collection("threads").updateOne(
            { _id: ObjectId(tabDetails.thread_id) },
            { $push: { tabs: insertedTabId } },
            function (err, result) {
              if (err) throw err;
              return res.status(200).json({
                status: 200,
                message: "Tab created.",
                tab_id: insertedTabId,
              });
            }
          );
        });
      }
    );
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

module.exports = router;
