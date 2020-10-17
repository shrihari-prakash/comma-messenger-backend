const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const path = require("path");
var ObjectId = require("mongodb").ObjectID;

const { Storage } = require("@google-cloud/storage");
// Creates a storage client
const storage = new Storage();

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cryptUtil = require("../../../../utils/crypt");
const crypt = new cryptUtil.crypt();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  download(req, res);
});

async function download(req, res) {
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

  if (!req.query.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!req.query.file_name) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `file name` was sent along with the request."
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
  //End of input validation.

  //Check if the given tab belongs to any thread.
  try {
    var threadObject = await db
      .collection("threads")
      .findOne({ tabs: { $in: [ObjectId(req.query.tab_id)] } });
    if (!threadObject) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails(
          "No thread exists for the provided `tab_id`"
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

    var tabObject = await db
      .collection("tabs")
      .find({
        _id: ObjectId(req.query.tab_id),
      })
      .project({
        _id: 0,
        tab_name: 0,
        thread_id: 0,
        messages: 0,
        date_created: 0,
      })
      .toArray();

    if (!tabObject || !tabObject[0]) {
      let error = new errorModel.errorResponse(
        errors.not_found.withDetails("No tab exists for the provided `tab_id`")
      );
      return res.status(404).json(error);
    }

    tabObject = tabObject[0];

    if (tabObject.require_authentication == true) {
      var userObject = await db
        .collection("users")
        .findOne({ _id: ObjectId(loggedInUserId) });

      let dbPassword = userObject.tab_password;

      if (!req.query.password) {
        let error = new errorModel.errorResponse(errors.invalid_access);
        return res.status(401).json(error);
      }
      let passwordVerified = bcrypt.compareSync(req.query.password, dbPassword);
      if (passwordVerified !== true) {
        let error = new errorModel.errorResponse(errors.invalid_access);
        return res.status(401).json(error);
      }
    }

    getSignedURL(`user-content/${req.query.tab_id}/${req.query.file_name}`)
      .then((fileURL) => {
        return res.status(200).json({
          status: 200,
          message: "File retrieved.",
          data: [
            {
              presigned_url: fileURL,
            },
          ],
        });
      })
      .catch(() => {
        let error = new errorModel.errorResponse(errors.internal_error);
        return res.status(500).json(error);
      });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

function getSignedURL(fileName) {
  return new Promise((resolve, reject) => {
    let bucketName = process.env.GOOGLE_BUCKET_NAME;
    //Initialize file.
    const file = storage.bucket(bucketName).file(fileName);
    //Get a signed URL that expires in one day.
    return file
      .getSignedUrl({
        action: "read",
        expires: getExpiry(),
      })
      .then((signedUrls) => {
        resolve(signedUrls[0]);
      })
      .catch((e) => {
        console.log(e);
        reject(false);
      });
  });
}

function getExpiry() {
  return new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

module.exports = router;
