const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cryptUtil = require("../../../../utils/crypt");
const crypt = new cryptUtil.crypt();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  getThreads(req, res);
});

async function getThreads(req, res) {
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

  if (!req.query.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!req.query.limit || !req.query.offset) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `limit` (or) `offset` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (req.query.password) {
    let password = req.query.password;
    if (isEmptyOrSpaces(password) || password.length < 4) {
      let error = new errorModel.errorResponse(
        errors.invalid_input.withDetails(
          "Provided password does not meet security requirements."
        )
      );
      return res.status(400).json(error);
    }
  }

  //Check if the given tab beelongs to any thread.
  try {
    db.collection("threads").findOne(
      { tabs: { $in: [ObjectId(req.query.tab_id)] } },
      function (err, threadObject) {
        if (err) {
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.json(error);
        }
        if (!threadObject) {
          let error = new errorModel.errorResponse(
            errors.not_found.withDetails(
              "No thread exists for the provided `thread_id`"
            )
          );
          return res.status(404).json(error);
        }
        //Even if the tab does belong to a valid thread, we still need to check if the current user is a part of the thread to which the tab belongs.
        var hasAccess = threadObject.thread_participants.some(function (
          participantId
        ) {
          return participantId.equals(loggedInUserId);
        });
        if (!hasAccess) {
          let error = new errorModel.errorResponse(errors.invalid_permission);
          return res.status(401).json(error);
        }

        db.collection("tabs")
          .find({
            _id: ObjectId(req.query.tab_id),
          })
          .project({
            messages: {
              $slice: [parseInt(req.query.offset), parseInt(req.query.limit)],
            },
            _id: 0,
            tab_name: 0,
            thread_id: 0,
            date_created: 0,
          })
          .toArray(function (err, tabObject /* [array] */ ) {
            if (!tabObject)
              return res.status(200).json({
                status: 200,
                message: "No messages to retrieve.",
                result: [],
              });

            if (tabObject[0].messages) //After the tab is retrieved successfully, loop through the messages and decrypt everything to send to client.
              tabObject[0].messages.forEach((messageObject, index) => {
                let decrypted = crypt.decrypt(messageObject.content);
                tabObject[0].messages[index].content = decrypted;
              });

              if(tabObject[0].password[loggedInUserId] && tabObject[0].password[loggedInUserId] != null) {
                if(!req.query.password) {
                  let error = new errorModel.errorResponse(errors.invalid_access);
                  return res.status(401).json(error);
                }
                let passwordVerified = bcrypt.compareSync(req.query.password, tabObject[0].password[loggedInUserId]); 
                if(passwordVerified !== true) {
                  let error = new errorModel.errorResponse(errors.invalid_access);
                  return res.status(401).json(error);
                }
              }

              delete tabObject[0].password;

            return res.status(200).json({
              status: 200,
              message: "Messages Retrieved.",
              result: tabObject,
            });
          });
      }
    );
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.json(error);
  }
}

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

module.exports = router;
