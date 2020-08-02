const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const tokenMgr = require("../../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const userMgr = require("../../../../utils/dbUtils/userManager");
const userManager = new userMgr.userManager();

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

//Google auth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:26398/api/rest/v1/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      return cb(null, profile);
    }
  )
);

router.get(
  "/google",
  (req, res, next) => {
    console.log(req.query);
    conID = req.query.s;
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }) //The `profile-email` scope is the most minimal amount of data you can get without sending your app for verification.
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/google" }),
  async function (req, res) {
    postAuthenticate(req, res);
  }
);

async function postAuthenticate(req, res) {
  let fullName = req.user.name;
  let email = req.user.emails[0].value;
  let displayPictureURL = req.user.photos[0].value;

  let user = {
    name: fullName, //{object} - contains keys :givenName and :familyName.
    email: email,
    display_picture: displayPictureURL,
    threads: [],
  };

  let db = req.app.get("mongoInstance");

  userManager
    .checkExistingUser(db, email)
    .then((existingUser) => {
      if (typeof existingUser === "boolean" && existingUser === false) {
        db.collection("users").insertOne(user, { w: 1 }, function (
          err,
          result
        ) {
          if (err) throw err;
          let insertedUserId = user._id;

          tokenManager
            .generate(db, insertedUserId, req.app.get("cacheManager"))
            .then((insertToken) => {
              return res.status(200).json({
                status: "SUCCESS",
                message: "Account Created.",
                user_data: user,
                token: insertToken,
              });
            });
        });
      } else {
        tokenManager
          .generate(db, existingUser._id, req.app.get("cacheManager"))
          .then((insertToken) => {
            //Ideally this should be a redirect to front end with user data and token encoded as url params.
            return res.status(200).json({
              status: "SUCCESS",
              message: "Login success.",
              user_data: existingUser,
              token: insertToken,
            });
          });
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({
        status: "ERR",
        reason: "INTERNAL_SERVER_ERROR",
        insight: err,
      });
    });
}

module.exports = router;
