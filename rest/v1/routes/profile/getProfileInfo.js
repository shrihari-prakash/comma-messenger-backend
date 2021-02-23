const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  //End of input validation.

  try {
    var userObject = await db.collection("users").findOne(
      {
        _id: ObjectId(loggedInUserId),
      },
      {
        projection: { _id: 0, threads: 0, master_password: 0, tab_password: 0 },
      }
    );
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
