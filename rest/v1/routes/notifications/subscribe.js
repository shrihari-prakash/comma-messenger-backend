const express = require("express");
const router = express.Router();

var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");


router.post("/", async function (req, res) {
  subscribeUser(req, res);
});

async function subscribeUser(req, res) {
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

  let subscriptionDetails = req.body;

  try {
    db.collection("users").updateOne(
      { _id: ObjectId(loggedInUserId) },
      { $addToSet: { notification_subscriptions: subscriptionDetails } },
      function (err, result) {
        if (err) throw err;
        return res.status(200).json({
          status: 200,
          message: "Subscribed.",
        });
      }
    );
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

module.exports = router;
