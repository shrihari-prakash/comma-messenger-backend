const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errorBuilder = require("../../../../utils/responseErrorBuilder");

const editableProperties = [
  "name",
  "familyName",
  "givenName",
  "display_picture",
];

router.put("/", async function (req, res) {
  editProfileInfo(req, res);
});

async function editProfileInfo(req, res) {
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

  let userDetails = req.body;

  if (
    objectIterator(userDetails) == false ||
    checkJSONSchema(userDetails) == false
  )
    return res.status(400).json({
      status: "ERR",
      reason: errorBuilder.buildReason("invalid", "PROFILE_DETAILS"),
      insight: errorBuilder.buildInsight("invalid", "profile details object"),
    });

  console.log(JSON.stringify({ $set: userDetails }));

  db.collection("users").updateOne(
    { _id: ObjectId(loggedInUserId) },
    { $set: userDetails },
    function (err, result) {
      if (err) throw err;
      return res.status(200).json({
        status: "SUCCESS",
        message: "Profile info changed.",
      });
    }
  );
}

function objectIterator(o) {
  let returnValue = true;
  Object.keys(o).forEach(function (k) {
    if (o[k] !== null && typeof o[k] === "object") {
      objectIterator(o[k]);
    }
    if (typeof o[k] === "string") {
      console.log(k);
      console.log(editableProperties.includes(k));
      if (!editableProperties.includes(k)) {
        returnValue = false;
        return false;
      }
    }
  });
  console.log(returnValue)
  return(returnValue)
}

function checkJSONSchema(userDetails) {
  if (userDetails.name) {
    if (!userDetails.name.familyName || !userDetails.name.givenName)
      return false;
  }
  return true;
}

module.exports = router;
