const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
var ObjectId = require("mongodb").ObjectID;

const { Storage } = require("@google-cloud/storage");
// Creates a storage client
const storage = new Storage();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.get("/", async function (req, res) {
  download(req, res);
});

async function download(req, res) {
  //Start of input validation.
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

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
      .findOne({ _id: ObjectId(req.query.thread_id) });
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
