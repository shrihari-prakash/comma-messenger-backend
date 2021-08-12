const express = require("express");
const router = express.Router();

const newThread = require("./newThread");
const getThreads = require("./getThreads");
const getThreadInfo = require("./getThreadInfo");

router.use("/newThread", newThread);

router.use("/getThreads", getThreads);

router.use("/getThreadInfo", getThreadInfo);

module.exports = router;
