const chai = require("chai");

var server = require("../app");

var objectIds = {
  threadId: null,
  tabIds: {
    withAuthentication: null,
    withoutAuthentication: null,
  },
};

exports.server = server;
exports.chai = chai;
exports.objectIds = objectIds;
