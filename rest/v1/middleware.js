const express = require("express");
const router = express.Router();

const authGoogle = require("./routes/auth/google");
const threadsMiddleware = require("./routes/threads/threadsMiddleware");
const tabsMiddleware = require("./routes/tabs/tabsMiddleware");
const messagesMiddleware = require("./routes/messages/messagesMiddleware");
const profileMiddleware = require("./routes/profile/profileMiddleware");
const filesMiddleware = require("./routes/files/filesMiddleware");
const notificationsMiddleware = require("./routes/notifications/notificationsMiddleware");
const spotifyMiddleware = require("./routes/spotify/spotifyMiddleware");

const checkAuth = require("./interceptors/checkAuth");

/* Here's how it works: Each user is a part of multiple threads which have different people. Once the user goes into a thread,
it has different tabs just like a browser window, each tab can contain messages on different topics. */

router.get("/helloWorld", (req, res, next) => {
  return res.status(200).json({
    status: "SUCCESS",
    message: "Hello world!",
  });
});

router.use("/auth", authGoogle);

router.use("/threads", checkAuth, threadsMiddleware);

router.use("/tabs", checkAuth, tabsMiddleware);

router.use("/messages", checkAuth, messagesMiddleware);

router.use("/profile", checkAuth, profileMiddleware);

router.use("/files", checkAuth, filesMiddleware);

router.use("/notifications", checkAuth, notificationsMiddleware);

router.use("/spotify", checkAuth, spotifyMiddleware);

module.exports = router;
