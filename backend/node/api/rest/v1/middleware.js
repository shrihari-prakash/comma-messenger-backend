const express = require("express");
const router = express.Router();

const authGoogle = require("./routes/auth/google");
const threadsMiddleware = require("./routes/threads/threadsMiddleware");
const tabsMiddleware = require("./routes/tabs/tabsMiddleware");
const messagesMiddleware = require("./routes/messages/messagesMiddleware");
const profileMiddleware = require("./routes/profile/profileMiddleware");

router.get("/helloWorld", (req, res, next) => {
  return res.status(200).json({
    status: "SUCCESS",
    message: "Hello world!",
  });
});

router.use("/auth", authGoogle);

router.use("/threads", threadsMiddleware);

router.use("/tabs", tabsMiddleware);

router.use("/messages", messagesMiddleware);

router.use("/profile", profileMiddleware);

module.exports = router;
