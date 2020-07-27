const express = require("express");
const router = express.Router();
const MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
  let authToken = req
    .header("authorization")
    .slice(7, req.header("authorization").length)
    .trimLeft();

  if (!authToken)
    return res.status(403).json({
      status: "ERR",
      reason: "UNAUTHORIZED",
      insight: "Authorization token was not found in the request.",
    });

  let cacheManager = req.app.get("cacheManager");

  let loggerInUser = await tokenManager.verify(authToken, cacheManager);

  if (!loggerInUser)
    return res.status(404).json({
      status: "ERR",
      reason: "NO_USER",
      insight: "No user exists for the provided session.",
    });

  MongoClient.connect(
    "mongodb://" + process.env.MONGO_HOST,
    { useUnifiedTopology: true },
    async function (err, client) {
      if (err)
        return res.status(500).json({
          status: "ERR",
          reason: "INTERNAL_SERVER_ERROR",
          insight: err,
        });

      var db = client.db("comma");

      db.collection("users").findOne(
        {
          _id: ObjectId(loggerInUser.user_id),
        },
        function (err, userObject) {
          console.log(userObject);
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
              if (err) throw err;
              console.log(result);
              return res.status(200).json({
                status: "SUCCESS",
                message: "Threads Retrieved.",
                threads: result,
              });
            });
        }
      );
    }
  );
}

module.exports = router;
