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

  if (!req.query.limit || !req.query.offset) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `limit` (or) `offset` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
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
    db.collection("users").findOne(
      {
        _id: ObjectId(loggedInUserId),
      },
      function (err, userObject) {
        if (err) throw err;
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
                      display_picture: 1,
                      number_of_tabs: { $size: "$tabs" },
                    },
                  },
                ],
                as: "thread_participants",
              },
            },
            { $skip: parseInt(req.query.offset) },
            { $limit: parseInt(req.query.limit) },
          ]) //Joining both 'users' and 'threads' collection since the thread list view usually requires the name of everyone who is involved in that thread.
          .toArray(function (err, result) {
            if (err) {
              console.log(err)
              let error = new errorModel.errorResponse(errors.internal_error);
              return res.json(error);
            }
            if (!result) {
              return res.status(200).json({
                status: 200,
                message: "No threads to retrieve.",
                result: [],
              });
            }
            return res.status(200).json({
              status: 200,
              message: "Threads Retrieved.",
              result: result,
            });
          });
      }
    );
  } catch (e) {
    console.log(e)
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

module.exports = router;
