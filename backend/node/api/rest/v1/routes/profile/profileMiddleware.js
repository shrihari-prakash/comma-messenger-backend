const express = require("express");
const router = express.Router();

const editProfileInfo = require("./editProfileInfo");

router.use("/editProfileInfo", editProfileInfo);

module.exports = router;
