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
  try {
    db.collection("users").findOne(
      {
        _id: ObjectId(loggerInUser.user_id),
      },
      function (err, userObject) {
        db.collection("threads")
          .aggregate([
            {
              $match: {
                _id: {
                  $in: userObject.threads,
                },
              },
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
                    },
                  },
                ],
                as: "thread_participants",
              },
            },
          ])
          .toArray(function (err, result) {
            if (err)
              return res.status(500).json({
                status: "ERR",
                reason: errorBuilder.buildReason("isr"),
                insight: errorBuilder.buildInsight("isr", err),
              });
            if (!result)
              return res.status(200).json({
                status: "SUCCESS",
                message: "No threads to retrieve.",
                result: [],
              });
            console.log(result);
            return res.status(200).json({
              status: "SUCCESS",
              message: "Threads Retrieved.",
              result: result,
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
