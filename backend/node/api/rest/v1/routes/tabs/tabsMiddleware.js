const express = require("express");
const router = express.Router();

const newTab = require("./newTab");
/* const getTabs = require("./getTabs") */


router.use("/newTab", newTab);

/* router.use("/getThreads", getThreads); */

module.exports = router;
