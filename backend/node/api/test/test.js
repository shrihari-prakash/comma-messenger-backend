function runTest(name, path) {
    describe(name, function () {
        require(path);
    });
}

var common = require("./common");

describe("REST APIs", function () {
    beforeEach(function () {
    });
    /* runTest("Create new thread:", './rest/threads/newThread'); */
    runTest("Get threads:", './rest/threads/getThreads');
    after(function () {
        console.log("Test suite execution complete.");
    });
});