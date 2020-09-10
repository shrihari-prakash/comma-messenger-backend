const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/threads/getThreads";

it("Get all threads of current user.", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ limit: 100, offset: 0 })
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      var result = res.body.result;
      result.forEach((thread) => {
        //Verify each thread has a valid id.
        thread.should.have
          .property("_id")
          .with.lengthOf(process.env.MONGO_OBJECT_ID_LENGTH);

        //Verify thread_participants is an array and has atleast one participant.
        thread.should.have
          .property("thread_participants")
          .that.is.a("array")
          .to.have.length.above(0);

        //Verify tabs is an array.
        thread.should.have.property("tabs").that.is.a("array");

        //Verify new_for is an array.
        thread.should.have.property("new_for").that.is.a("array");

        //Verify date_created is a string.
        thread.should.have
          .property("date_created")
          .that.is.a("string")
          .to.have.length.above(0);

        //Verify date_updated is a string.
        thread.should.have
          .property("date_updated")
          .that.is.a("string")
          .to.have.length.above(0);
      });
      done();
    });
});

it("Get threads with no API key", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ limit: 100, offset: 0 })
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});

it("Get threads with invalid API key", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ limit: 100, offset: 0 })
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});

it("Get threads without limit.", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ offset: 0 })
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});

it("Get threads without offset.", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ limit: 100 })
    .set("Authorization", `Bearer ${common.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_INPUT");
      done();
    });
});
