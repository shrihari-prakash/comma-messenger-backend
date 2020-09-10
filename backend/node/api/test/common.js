const chai = require("chai");

var server = require("../app");

var objectIds = {
  threadId: null,
  tabIds: {
    withAuthentication: null,
    withoutAuthentication: null,
  },
};

var apiToken = null;
var receiverEmail = null;

exports.server = server;
exports.chai = chai;
exports.objectIds = objectIds;
exports.apiToken = apiToken;
exports.receiverEmail = receiverEmail;