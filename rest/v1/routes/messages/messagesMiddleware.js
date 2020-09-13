const express = require("express");
const router = express.Router();

const getMessages = require("./getMessages");

router.use("/getMessages", getMessages);

module.exports = router;
