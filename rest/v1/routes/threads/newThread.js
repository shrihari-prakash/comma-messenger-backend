const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  createThread(req, res);
});

async function createThread(req, res) {
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
    let error = new errorModel.errorResponse(
      errors.not_found.withDetails("No user exists for the session")
    );
    return res.status(404).json(error);
  }

  if (!req.query.email || !validateEmail(req.query.email)) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `email` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  userManager.checkExistingUser(db, req.query.email).then(async (receiver) => {
    if (typeof receiver === "boolean" && receiver === false) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No recipient found for the provided email"
        )
      );
      return res.status(404).json(error);
    } else {
      let threadObject = {
        thread_participants: [ObjectId(loggedInUserId), receiver._id],
        tabs: [],
        new_for: [],
        date_created: new Date(),
        date_updated: new Date(),
      };
      try {
        //Insert into threads and push the inserted thread _id into array of threads in users.
        var threadInsertResult = await db
          .collection("threads")
          .insertOne(threadObject, { w: 1 });

        if (threadInsertResult.result.ok != 1) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.json(error);
        }

        let insertedThreadId = threadObject._id;

        var userUpdateResult = await db
          .collection("users")
          .updateMany(
            { _id: { $in: [ObjectId(loggedInUserId), receiver._id] } },
            { $push: { threads: insertedThreadId } }
          );

        if (userUpdateResult.result.ok != 1) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.json(error);
        }

        return res.status(200).json({
          status: 200,
          message: "Thread created.",
          thread_id: insertedThreadId,
        });
      } catch (e) {
        let error = new errorModel.errorResponse(errors.internal_error);
        return res.json(error);
      }
    }
  });
}

function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

module.exports = router;