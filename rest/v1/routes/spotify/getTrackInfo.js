const express = require("express");
const router = express.Router();
var ObjectId = require("mongodb").ObjectID;

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

const spotifyUtils = require("../../../../utils/spotify/spotifyUtils");

router.get("/", async function (req, res) {
  getTrackInfo(req, res);
});

async function getTrackInfo(req, res) {
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
