const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/tabs/newTab";

var tabObject = {
  thread_id: null,
  tab_name: "test_tab",
  require_authentication: true,
}

it("Create tab with valid thread id and authentication", function (done) {
  tabObject.thread_id = common.objectIds.threadId; //Get tab id set by previous test

  chai
    .request(server)
    .post(endPoint)
    .send(tabObject)
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      res.body.should.have.property("tab_id").which.is.an("string");
      res.body.tab_id.length.should.be.eql(
        parseInt(process.env.MONGO_OBJECT_ID_LENGTH)
      );

      common.objectIds.tabIds.withAuthentication = res.body.tab_id;
      done();
    });
});

it("Create tab with valid thread id and no authentication", function (done) {

  tabObject.require_authentication = false;

  chai
    .request(server)
    .post(endPoint)
    .send(tabObject)
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      res.body.should.have.property("tab_id").which.is.an("string");
      res.body.tab_id.length.should.be.eql(
        parseInt(process.env.MONGO_OBJECT_ID_LENGTH)
      );

      common.objectIds.tabIds.withoutAuthentication = res.body.tab_id;
      done();
    });
});

it("Create tab with invalid API key", function (done) {
  chai
    .request(server)
    .post(endPoint)
    .send(tabObject)
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});

it("Create tab with non-existant thread_id", function (done) {
  tabObject.thread_id = "5f413bc55124d247f0951c63"; //Some random id.
  chai
    .request(server)
    .post(endPoint)
    .send(tabObject)
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(404);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("NOT_FOUND");
      done();
    });
});

it("Create tab without sending a thread id", function (done) {
  let tabWithoutThreadId = tabObject;
  delete tabWithoutThreadId.thread_id;

  chai
    .request(server)
    .post(endPoint)
    .send(tabWithoutThreadId)
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});

it("Create tab without sending a tab_name", function (done) {
  let tabWithoutTabName = tabObject;
  delete tabWithoutTabName.tab_name;

  chai
    .request(server)
    .post(endPoint)
    .send(tabWithoutTabName)
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});
