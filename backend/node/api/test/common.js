const chai = require("chai");

var server = require("../app");

var objectIds = {
  threadId: null,
  tab_id: null,
};

exports.server = server;
exports.chai = chai;
exports.objectIds = objectIds;
