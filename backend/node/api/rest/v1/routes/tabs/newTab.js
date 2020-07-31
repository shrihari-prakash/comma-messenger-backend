const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errorBuilder = require("../../../../utils/responseErrorBuilder");

router.post("/", async function (req, res) {
  createThread(req, res);
});

async function createThread(req, res) {
  
  if (!req.header("authorization"))
    return res.status(403).json({
      status: "ERR",
      reason: errorBuilder.buildReason("unauthorized"),
      insight: errorBuilder.buildInsight("unauthorized"),
    });
  let authToken = req
    .header("authorization")
    .slice(7, req.header("authorization").length)
    .trimLeft();

  if (!authToken)
    return res.status(403).json({
      status: "ERR",
      reason: errorBuilder.buildReason("unauthorized"),
      insight: errorBuilder.buildInsight("unauthorized"),
    });

  let cacheManager = req.app.get("cacheManager");

  let db = req.app.get("mongoInstance");

  let loggedInUserId = await tokenManager.verify(db, authToken, cacheManager);

  if (!loggedInUserId)
    return res.status(404).json({
      status: "ERR",
      reason: errorBuilder.buildReason("unauthorized"),
      insight: errorBuilder.buildInsight("unauthorized"),
    });

  let tabDetails = req.body;

  if (!tabDetails.thread_id)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "THREAD_ID"),
      insight: errorBuilder.buildInsight("empty", "thread id"),
    });

  if (!tabDetails.tab_name)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "TAB_NAME"),
      insight: errorBuilder.buildInsight("empty", "tab name"),
    });

  db.collection("threads").findOne(
    { _id: ObjectId(tabDetails.thread_id) },
    function (err, threadObject) {
      if (err)
        return res.status(400).json({
          status: "ERR",
          reason: errorBuilder.buildReason("invalid", "THREAD_ID"),
          insight: errorBuilder.buildInsight("invalid", "thread id"),
        });

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
              status: "SUCCESS",
              message: "Tab created.",
              tab_id: insertedTabId,
            });
          }
        );
      });
    }
  );
}

module.exports = router;
