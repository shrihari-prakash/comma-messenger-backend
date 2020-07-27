const express = require("express");
const router = express.Router();

const newThread = require("./newThread");
const getThreads = require("./getThreads")


router.use("/newThread", newThread);

router.use("/getThreads", getThreads);

module.exports = router;
