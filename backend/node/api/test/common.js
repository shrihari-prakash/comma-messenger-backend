const chai = require("chai");

var server = require("../app");

var objectIds = {
  threadId: null,
  tabIds: {
    withAuthentication: null,
    withoutAuthentication: null,
  },
};

var user1 = {
  apiToken: null,
  email: null
}

var user2 = {
  apiToken: null,
  email: null
}

exports.server = server;
exports.chai = chai;
exports.objectIds = objectIds;
exports.user1 = user1;
exports.user2 = user2;