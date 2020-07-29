const express = require("express");
const router = express.Router();

const newTab = require("./newTab");
const getTabs = require("./getTabs")
const renameTab = require("./renameTab")


router.use("/newTab", newTab);

router.use("/getTabs", getTabs);

router.use("/renameTab", renameTab);

module.exports = router;
