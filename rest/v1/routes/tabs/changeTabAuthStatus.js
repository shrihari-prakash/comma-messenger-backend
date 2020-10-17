const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.put("/", async function (req, res) {
  changeAuthStatus(req, res);
});

async function changeAuthStatus(req, res) {
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

  let headerUserId = req.header("x-cm-user-id");

  if (!headerUserId) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let cacheManager = req.app.get("cacheManager");

  let db = req.app.get("mongoInstance");

  let loggedInUserId = await tokenManager.verify(
    db,
    headerUserId,
    authToken,
    cacheManager
  );

  if (!loggedInUserId) {
    let error = new errorModel.errorResponse(errors.invalid_key);
    return res.status(403).json(error);
  }

  let tabInfo = req.body;

  if (!tabInfo.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (typeof tabInfo.require_authentication != "boolean") {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid value for `require_authentication` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  try {
    var threadObject = await db
      .collection("threads")
      .findOne({ tabs: { $in: [ObjectId(tabInfo.tab_id)] } });

    if (!threadObject) {
      let error = new errorModel.errorResponse(
        errors.invalid_input.withDetails(
          "No valid `tab_id` was sent along with the request."
        )
      );
      return res.status(400).json(error);
    }

    var hasAccess = threadObject.thread_participants.some(function (
      participantId
    ) {
      return participantId.equals(loggedInUserId);
    });
    if (!hasAccess) {
      let error = new errorModel.errorResponse(errors.invalid_permission);
      return res.status(401).json(error);
    }

    let authentication_operator =
      tabInfo.require_authentication == true ? "$addToSet" : "$pull";

    if (tabInfo.require_authentication == false) {
      var userObject = await db
        .collection("users")
        .findOne({ _id: ObjectId(loggedInUserId) });

      let dbPassword = userObject.tab_password;

      if (dbPassword != null) {
        if (!tabInfo.password) {
          let error = new errorModel.errorResponse(
            errors.invalid_input.withDetails(
              "Provided password does not match with the one on the system."
            )
          );
          return res.status(400).json(error);
        }
        let passwordVerified = bcrypt.compareSync(tabInfo.password, dbPassword);
        if (passwordVerified !== true) {
          let error = new errorModel.errorResponse(
            errors.invalid_input.withDetails(
              "Provided password does not match with the one on the system."
            )
          );
          return res.status(400).json(error);
        }
      }
    }
    var tabUpdateResult = await db
      .collection("tabs")
      .updateOne(
        { _id: ObjectId(tabInfo.tab_id) },
        { [authentication_operator]: { secured_for: ObjectId(loggedInUserId) } }
      );

    if (tabUpdateResult.result.ok != 1) {
      let error = new errorModel.errorResponse(errors.internal_error);
      return res.status(500).json(error);
    }

    return res.status(200).json({
      status: 200,
      message:
        "Tab " +
        (tabInfo.require_authentication == true ? "locked." : "unlocked."),
    });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
