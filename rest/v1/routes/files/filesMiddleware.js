const express = require("express");
const router = express.Router();

const upload = require("./upload");
const download = require("./download");

router.use("/upload", upload);
router.use("/download", download);

module.exports = router;
