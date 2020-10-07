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
  //Start of input validation.
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
  //End of input validation.

  try {
    var userObject = await db.collection("users").findOne({
      _id: ObjectId(loggedInUserId),
    }, { projection: { _id: 0, threads: 0, master_password: 0, tab_password: 0 } });
    return res.status(200).json({
      status: 200,
      message: "User Profile Retrieved.",
      result: userObject,
    });
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
