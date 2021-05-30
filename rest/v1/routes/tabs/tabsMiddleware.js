const express = require("express");
const router = express.Router();

const newTab = require("./newTab");
const renameTab = require("./renameTab")
const changeTabAuthStatus = require("./changeTabAuthStatus")


router.use("/newTab", newTab);

router.use("/renameTab", renameTab);

router.use("/changeTabAuthStatus", changeTabAuthStatus);

module.exports = router;
