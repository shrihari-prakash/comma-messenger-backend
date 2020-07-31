const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cryptUtil = require("../../../../utils/crypt");
const crypt = new cryptUtil.crypt();

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

  let loggedInUserId = await tokenManager.verify(db, authToken, cacheManager);

  if (!loggedInUserId)
    return res.status(403).json({
      status: "ERR",
      reason: errorBuilder.buildReason("unauthorized"),
      insight: errorBuilder.buildInsight("unauthorized"),
    });

  if (!req.query.tab_id)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "TAB_ID"),
      insight: errorBuilder.buildInsight("empty", "tab id"),
    });
  if (!req.query.limit || !req.query.offset)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "LIMIT_OFFSET"),
      insight: errorBuilder.buildInsight("empty", "limit or offset"),
    });
  try {
    db.collection("threads").findOne(
      { tabs: { $in: [ObjectId(req.query.tab_id)] } },
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
          return participantId.equals(loggedInUserId);
        });
        if (!hasAccess)
          return res.status(404).json({
            status: "ERR",
            reason: errorBuilder.buildReason("unauthorized"),
            insight: errorBuilder.buildInsight("unauthorized"),
          });

        db.collection("tabs")
          .find({
            _id: ObjectId(req.query.tab_id),
          })
          .project({
            messages: {
              $slice: [parseInt(req.query.offset), parseInt(req.query.limit)],
            },
            _id: 0,
            tab_name: 0,
            thread_id: 0,
            date_created: 0,
          })
          .toArray(function (err, tabObject) {
            if (!tabObject)
              return res.status(200).json({
                status: "SUCCESS",
                message: "No messages to retrieve.",
                result: [],
              });
              console.log(tabObject);
            if (tabObject[0].messages)
              tabObject[0].messages.forEach((messageObject, index) => {
                let decrypted = crypt.decrypt(messageObject.content);
                tabObject[0].messages[index].content = decrypted;
              });
            return res.status(200).json({
              status: "SUCCESS",
              message: "Messages Retrieved.",
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
