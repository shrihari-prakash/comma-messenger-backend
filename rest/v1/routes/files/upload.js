const express = require("express");
const router = express.Router();
var fs = require("fs");
const { ObjectId } = require("mongodb");

const { Storage } = require("@google-cloud/storage");
// Creates a storage client
const storage = new Storage();

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

router.post("/", async function (req, res) {
  upload(req, res);
});

async function upload(req, res) {
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

  if (!req.files || Object.keys(req.files).length === 0) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `file` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  if (!req.body.tab_id) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `tab_id` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }
  //End of input validation.

  try {
    var threadObject = await db
      .collection("threads")
      .findOne({ tabs: { $in: [ObjectId(req.body.tab_id)] } });

    console.log("thread", threadObject);

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

    // The name of the input field (i.e. "attachment") is used to retrieve the uploaded file
    let file = req.files.attachment;
    let fileName = new Date().valueOf() + "_" + file.name;
    var dir = `${__dirname}/../../../../user-content/${req.body.tab_id}`;
    var cloudStorageDir = `user-content/${req.body.tab_id}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }, (err) => {
        console.log(err);
      });
    }

    // Use the mv() method to place the file somewhere on your server
    file.mv(dir + `/${fileName}`, function (err) {
      if (err) return res.status(500).send(err);

      uploadFile(dir + `/${fileName}`, cloudStorageDir + `/${fileName}`)
        .then(() => {
          // Remove file from local after uploading to cloud.
          fs.unlink(dir + `/${fileName}`, (err) => {
            if (err) throw err;
            console.log(dir + `/${fileName} was removed from temp`);
          });

          return res.status(200).json({
            status: 200,
            message: "File uploaded.",
            data: [
              {
                file_name: fileName,
              },
            ],
          });
        })
        .catch((e) => {
          console.log(e);
          let error = new errorModel.errorResponse(errors.internal_error);
          return res.status(500).json(error);
        });
    });
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

async function uploadFile(filename, cloudStorageDir) {
  return new Promise(async (resolve, reject) => {
    try {
      let bucketName = process.env.GOOGLE_BUCKET_NAME;
      // Uploads a local file to the bucket
      await storage.bucket(bucketName).upload(filename, {
        destination: cloudStorageDir,
        // Support for HTTP requests made with `Accept-Encoding: gzip`
        gzip: true,
        // By setting the option `destination`, you can change the name of the
        // object you are uploading to a bucket.
        metadata: {
          // Enable long-lived HTTP caching headers
          // Use only if the contents of the file will never change
          // (If the contents will change, use cacheControl: 'no-cache')
          cacheControl: "public, max-age=31536000",
        },
      });

      resolve(true);

      console.log(`${filename} uploaded to ${bucketName}.`);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = router;
