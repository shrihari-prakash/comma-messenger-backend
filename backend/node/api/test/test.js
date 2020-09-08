function runTest(name, path) {
  describe(name, function () {
    require(path);
  });
}

var common = require("./common");

describe("REST APIs", function () {
  beforeEach(function () {});
  //Supress logs before starting test.
  var log = console.log;
  /* console.log = () => {}; */

  runTest("Create new thread:", "./rest/threads/newThread");
  runTest("Get threads:", "./rest/threads/getThreads");
  runTest("Create new tab:", "./rest/tabs/newTab");
  runTest("Get tabs:", "./rest/tabs/getTabs");
  runTest("Rename tab:", "./rest/tabs/renameTab");
  runTest("Change tab auth status:", "./rest/tabs/changeTabAuthStatus");
  after(function () {
    //Restore logs.
    console.log = log;
    console.log("Test suite execution complete.");
  });
});
