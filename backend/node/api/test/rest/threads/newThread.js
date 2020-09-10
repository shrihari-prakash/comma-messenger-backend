const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/threads/newThread";

it("Create thread with valid email id", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ email: common.receiverEmail })
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      res.body.should.have.property("thread_id").which.is.an("string");
      res.body.thread_id.length.should.be.eql(
        parseInt(process.env.MONGO_OBJECT_ID_LENGTH)
      ); //24 is the MongoDB object id length.
      common.objectIds.threadId = res.body.thread_id;
      done();
    });
});

it("Create thread with invalid API key", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ email: common.receiverEmail })
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(404);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("NOT_FOUND");
      done();
    });
});

it("Create thread with non-existant email id", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ email: "johndoe@example.com" })
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(404);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("NOT_FOUND");
      done();
    });
});

it("Create thread without sending an email id", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});
