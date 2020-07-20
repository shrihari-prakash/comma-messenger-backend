const express = require("express");
const router = express.Router();

router.get("/helloWorld", (req, res, next) => {
  return res.status(200).json({
    status: "SUCCESS",
    message: "Hello world!",
  });
});

module.exports = router;
