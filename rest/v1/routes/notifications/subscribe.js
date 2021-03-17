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
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  let subscriptionDetails = req.body;

  try {
    let tokenObject = await tokenManager.getIdFromToken(
      db,
      loggedInUserId,
      authToken
    );

    db.collection("users").updateOne(
      { _id: ObjectId(loggedInUserId) },
      {
        $addToSet: {
          notification_subscriptions: {
            token_id: tokenObject._id,
            subscription_object: subscriptionDetails,
          },
        },
      },
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
    return res.status(500).json(error);
  }
}

module.exports = router;
