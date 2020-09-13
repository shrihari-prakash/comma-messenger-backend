const runTest = (name, path) => {
  describe(name, function () {
    require(path);
  });
}

const requireUncache = (module) => {
  delete require.cache[require.resolve(module)];
  return require(module);
}

var testUtils = require("./utils");

//Supress logs before starting test.
var log = console.log;
/* console.log = () => {}; */

describe("REST APIs", function () {
  before((done) => {
    testUtils.mockUser().then(() => {
      done();
    });
  });

  beforeEach(function () {});
  runTest("Edit profile info:", "./rest/profile/editProfileInfo");
  runTest("Create new thread:", "./rest/threads/newThread");
  runTest("Get threads:", "./rest/threads/getThreads");
  runTest("Create new tab:", "./rest/tabs/newTab");
  runTest("Get tabs:", "./rest/tabs/getTabs");
  runTest("Rename tab:", "./rest/tabs/renameTab");
  runTest("Change tab auth status:", "./rest/tabs/changeTabAuthStatus");
});

describe("Chat Events", function () {
  const common = require("./common");
  
  const io = require("socket.io-client"),
    ioOptions = {
      path: "/api/socket/communicate",
      transports: ["websocket"],
      forceNew: true
    };

  beforeEach(function (done) {
    this.timeout(60000);
    // connect two io clients
    common.user1.socketConnection = io(`http://localhost:${process.env.PORT || 26398}/`, ioOptions);
    common.user2.socketConnection = io(`http://localhost:${process.env.PORT || 26398}/`, ioOptions);
    console.error = (e) => {
      console.log(e)
    }
    done();
  });

  before(function (done) {
    requireUncache("../app");
    done();
  });

  runTest("Message Exchange:", "./socket/messageExchange");

  afterEach(function (done) {
    // disconnect io clients after each test
    common.user1.socketConnection.disconnect();
    common.user2.socketConnection.disconnect();
    done();
  });

  after(function () {
    //Restore logs.
    console.log = log;
    console.log("Test suite execution complete.");
    testUtils.truncateDatabase();
  });
});
