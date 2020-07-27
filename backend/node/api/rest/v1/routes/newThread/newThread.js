const express = require("express");
const router = express.Router();
const MongoClient = require("mongodb").MongoClient;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

router.get("/", async function (req, res) {
  createThread(req, res);
});

async function createThread(req, res) {
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

  if (!req.query.email || !validateEmail(req.query.email))
    return res.status(403).json({
      status: "ERR",
      reason: "INVALID_RECIPIENT",
      insight: "The email address provided is not valid.",
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

      userManager.checkExistingUser(db, req.query.email).then((receiver) => {
        if (typeof receiver === "boolean" && receiver === false) {
          return res.status(404).json({
            status: "ERR",
            reason: "INVALID_RECIPIENT",
            insight: "Provided reveiver account does not exist.",
          });
        } else {
          let threadObject = {
            thread_participants: [loggerInUser.user_id, receiver._id],
            tabs: [],
            date_created: new Date(),
          };

          //Insert into threads and push the inserted thread _id into array of threads in users.
          db.collection("threads").insertOne(threadObject, { w: 1 }, function (
            err,
            result
          ) {
            if (err) throw err;
            let insertedThreadId = threadObject._id;
            db.collection("users").updateMany(
              { _id: { $in: [loggerInUser.user_id, receiver._id] } },
              { $push: { threads: insertedThreadId } },
              { multi: true },
              function (err, result) {
                if (err) throw err;
                client.close();
                return res.status(200).json({
                  status: "SUCCESS",
                  message: "Thread created.",
                  thread_id: insertedThreadId,
                });
              }
            );
          });
        }
      });
    }
  );
}

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

module.exports = router;
