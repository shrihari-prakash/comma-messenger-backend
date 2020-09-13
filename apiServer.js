//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const passport = require("passport");

const errors = require("./utils/errors");
const errorModel = require("./utils/errorResponse");

const RESTv1 = require("./rest/v1/middleware");
const cache = require("./utils/cacheManager");
const cacheManager = new cache.cacheManager();

cacheManager.init();

app.set("cacheManager", cacheManager);

const mongoConnector = require("./utils/dbUtils/mongoConnector");

mongoConnector.connectToServer(function (err, client) {
  if (err) console.log(err);
  /* This instance of db returned from the mongoConnector is used throughout the app 
  by all the end points to write and fetch data. (Except the socket connection) */
  let db = mongoConnector.getDb();
  let mongoClient = mongoConnector.getClient();
  app.set("mongoInstance", db);
  app.set("mongoClient", mongoClient);
});

//we need to allow requests from outside our own domain.
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL);
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  next();
});

app.use(bodyParser.json({ limit: "3mb" }));

app.use(bodyParser.urlencoded({ limit: "3mb", extended: true }));

//Limit the number of requests sent to the server per minute to prevent DDOS.
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
});

app.use(apiLimiter);

app.use((err, req, res, next) => {
  console.error(err);

  // body-parser will set this to 400 if the json is in error
  if (err.status === 400) {
    let error = new errorModel.errorResponse(
      errors.invalid_input_format.withDetails(
        "The request possibly is not a valid JSON."
      )
    );
    return res.status(400).json(error);
  }

  return next(err); // if it's not a 400, let the default error handling do it.
});

app.use(
  require("express-session")({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

app.use(fileUpload());

app.use(passport.initialize());
app.use(passport.session());

//Abstract express headers from end consumer.
app.disable('x-powered-by');

//API v1 routes.

app.use("/api/rest/v1", RESTv1);

//404 routes.

app.use(function(req, res) {
  let error = new errorModel.errorResponse(
    errors.not_found.withDetails(
      "The API endpoint you tried to hit is invalid, please refer to the API documentation here: https://github.com/Shrihari-Prakash/comma-js/blob/master/backend/node/api/docs/api_docs.md"
    )
  );
  return res.status(404).json(error);
});

module.exports = app;
