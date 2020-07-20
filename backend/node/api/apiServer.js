//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");

const RESTv1 = require("./rest/v1/middleware");

/* app.use(cors()); */
//we need to allow requests from outside our own domain.
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header(
    "Access-Control-Allow-Headers","Authorization"
  );
  next();
});

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

//API v1 route.

app.use("/api/rest/v1", RESTv1);

module.exports = app;
