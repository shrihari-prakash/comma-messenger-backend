const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errorBuilder = require("../../../../utils/responseErrorBuilder");

router.put("/", async function (req, res) {
  renameTab(req, res);
});

async function renameTab(req, res) {
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

  let tabInfo = req.body;

  if (!tabInfo.tab_id)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "TAB_ID"),
      insight: errorBuilder.buildInsight("empty", "tab id"),
    });

  if (!tabInfo.name)
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("empty", "TAB_NAME"),
      insight: errorBuilder.buildInsight("empty", "tab name"),
    });

  db.collection("threads").findOne(
    { tabs: { $in: [ObjectId(tabInfo.tab_id)] } },
    function (err, threadObject) {
      if (err)
        return res.status(400).json({
          status: "ERR",
          reason: errorBuilder.buildReason("invalid", "TAB_ID"),
          insight: errorBuilder.buildInsight("invalid", "tab id"),
        });

      db.collection("tabs").updateOne(
        { _id: ObjectId(tabInfo.tab_id) },
        { $set: { tab_name: tabInfo.name } },
        function (err, result) {
          if (err) throw err;
          return res.status(200).json({
            status: "SUCCESS",
            message: "Tab renamed.",
          });
        }
      );
    }
  );
}

module.exports = router;
