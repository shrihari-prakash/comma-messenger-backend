const express = require("express");
const router = express.Router();

const getTrackInfo = require("./getTrackInfo");

router.use("/getTrackInfo", getTrackInfo);

module.exports = router;
