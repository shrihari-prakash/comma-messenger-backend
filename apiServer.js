//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const cron = require("node-cron");

const errors = require("./utils/errors");
const errorModel = require("./utils/errorResponse");

const RESTv1 = require("./rest/v1/middleware");
const cache = require("./utils/cacheManager");
const cacheManager = new cache.cacheManager();

const messageHistoryCleanUp = require("./utils/cleanUpUtils/messageHistoryCleanUp");
const tokenCleanUp = require("./utils/cleanUpUtils/tokenCleanUp");

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
  startCleanUpCron(db);
});

const startCleanUpCron = (db) => {
  cron.schedule("0 */30 * * * *", () => {
    //messageHistoryCleanUp.runCleanUp(db);
    tokenCleanUp.runCleanUp(db);
  });
};

//we need to allow requests from outside our own domain.
app.all("*", function (req, res, next) {
  const allowedOrigins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    "http://localhost:5000", //Development
    process.env.CLIENT_URL, //Production
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, x-cm-user-id"
  );
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
  require("cookie-session")({
    keys: [process.env.SESSION_SECRET],
    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
);

app.use(fileUpload());

app.use(passport.initialize());
app.use(passport.session());

//Abstract express headers from end consumer.
app.disable("x-powered-by");

//API v1 routes.

app.use("/api/rest/v1", RESTv1);

//404 routes.

app.use(function (req, res) {
  let error = new errorModel.errorResponse(
    errors.not_found.withDetails(
      "The API endpoint you tried to hit is invalid, please refer to the API documentation here: https://github.com/Shrihari-Prakash/comma-js/blob/master/backend/node/api/docs/api_docs.md"
    )
  );
  return res.status(404).json(error);
});

module.exports = app;
