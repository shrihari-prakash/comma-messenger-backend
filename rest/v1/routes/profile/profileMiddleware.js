const express = require("express");
const router = express.Router();

const editProfileInfo = require("./editProfileInfo");
const getProfileInfo = require("./getProfileInfo");

router.use("/editProfileInfo", editProfileInfo);

router.use("/getProfileInfo", getProfileInfo);

module.exports = router;
