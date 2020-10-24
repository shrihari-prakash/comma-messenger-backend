const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

const spotifyUtils = require("../../../../utils/spotify/spotifyUtils");

router.get("/", async function (req, res) {
  getTrackInfo(req, res);
});

async function getTrackInfo(req, res) {
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

  let trackId = req.query.track_id;

  if (!trackId) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `track_id` values were sent along with the request."
      )
    );
    return res.status(400).json(error);
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
  //End of input validation.

  try {
    const trackInfo = await spotifyUtils.getTrackInfo(trackId);
    return res.status(200).json({
      status: 200,
      message: "Track info acquired.",
      result: trackInfo,
    });
  } catch (e) {
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

module.exports = router;
