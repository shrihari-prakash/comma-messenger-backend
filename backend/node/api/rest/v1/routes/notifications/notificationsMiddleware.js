const express = require("express");
const router = express.Router();

const subscribe = require("./subscribe");

router.use("/subscribe", subscribe);

module.exports = router;
