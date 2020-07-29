const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errorBuilder = require("../../../../utils/responseErrorBuilder");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
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

  let loggerInUser = await tokenManager.verify(db, authToken, cacheManager);

  if (!loggerInUser)
    return res.status(403).json({
      status: "ERR",
      reason: errorBuilder.buildReason("unauthorized"),
      insight: errorBuilder.buildInsight("unauthorized"),
    });

  if (!req.query.thread_id)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "THREAD_ID"),
      insight: errorBuilder.buildInsight("empty", "thread id"),
    });
  try {
    db.collection("threads").findOne(
      { _id: ObjectId(req.query.thread_id) },
      function (err, threadObject) {
        if (err)
          return res.status(500).json({
            status: "ERR",
            reason: errorBuilder.buildReason("isr"),
            insight: errorBuilder.buildInsight("isr", err),
          });
        if (!threadObject)
          return res.status(404).json({
            status: "ERR",
            reason: errorBuilder.buildReason("notFound", "THREAD"),
            insight: errorBuilder.buildInsight("notFound", "thread"),
          });
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(loggerInUser.user_id);
        });
        if (!hasAccess)
          return res.status(404).json({
            status: "ERR",
            reason: errorBuilder.buildReason("unauthorized"),
            insight: errorBuilder.buildInsight("unauthorized"),
          });

        db.collection("tabs")
          .find({
            _id: { $in: threadObject.tabs },
          })
          .toArray(function (err, tabObject) {
            if (!tabObject)
              return res.status(200).json({
                status: "SUCCESS",
                message: "No tabs to retrieve.",
                result: [],
              });
            return res.status(200).json({
              status: "SUCCESS",
              message: "Tabs Retrieved.",
              result: tabObject,
            });
          });
      }
    );
  } catch (e) {
    return res.status(500).json({
      status: "ERR",
      reason: errorBuilder.buildReason("isr"),
      insight: errorBuilder.buildInsight("isr", e),
    });
  }
}

module.exports = router;
