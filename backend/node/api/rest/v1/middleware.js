const express = require("express");
const router = express.Router();
const authGoogle = require("./routes/auth/google");
const newThread = require("./routes/newThread/newThread");

router.get("/helloWorld", (req, res, next) => {
  return res.status(200).json({
    status: "SUCCESS",
    message: "Hello world!",
  });
});

router.use("/auth", authGoogle);

router.use("/newThread", newThread);

module.exports = router;
