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

/* Here's how it works: Each user is a part of multiple threads which have different people. Once the user goes into a thread,
it has different tabs just like a browser window, each tab can contain messages on different topics. */

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

router.use("/files", filesMiddleware);

router.use("/notifications", notificationsMiddleware);

router.use("/spotify", spotifyMiddleware);

module.exports = router;
