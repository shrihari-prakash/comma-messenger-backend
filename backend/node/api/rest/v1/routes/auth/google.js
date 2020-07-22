const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MongoClient = require("mongodb").MongoClient;

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
  passport.authenticate("google", { scope: ["profile", "email"] })
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
    name: fullName, //object
    email: email,
    display_picture: displayPictureURL,
  };

  // Connect to the db
  MongoClient.connect("mongodb://" + process.env.MONGO_HOST, { useUnifiedTopology: true }, function (err, client) {
    if (err) throw err;

    var db = client.db("comma");

    db.collection("users").insertOne(user, { w: 1 }, function (err, result) {
      if (err) throw err;
      let insertedUserId = user._id;
      client.close();
    });
  });

  return res.status(200).json({
    status: "SUCCESS",
    message: "Login success",
    user_data: user,
  });
}

module.exports = router;
