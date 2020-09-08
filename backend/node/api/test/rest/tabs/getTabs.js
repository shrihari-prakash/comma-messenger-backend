const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/tabs/getTabs";

it("Get all tabs of a thread.", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .query({ thread_id: common.objectIds.threadId})
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      var result = res.body.result;
      result.forEach((tab) => {

        //Verify each tab has a valid id.
        tab.should.have
          .property("_id")
          .with.lengthOf(process.env.MONGO_OBJECT_ID_LENGTH);

        //Verify tab_name is string.
        tab.should.have
          .property("tab_name")
          .that.is.a("string")
          .to.have.length.above(0);

        //Verify thread_id is an object id.
        tab.should.have.property("thread_id").with.lengthOf(process.env.MONGO_OBJECT_ID_LENGTH);

        //Verify date_created is a string.
        tab.should.have
          .property("date_created")
          .that.is.a("string")
          .to.have.length.above(0);

        //Verify seen_status is an array containing fields for atleast two users.
        tab.should.have
          .property("seen_status")
          .that.is.a("array")
          .to.have.length.above(1);
      });
      done();
    });
});

it("Get tabs with no API key", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});

it("Get tabs with invalid API key", function (done) {
  chai
    .request(server)
    .get(endPoint)
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});
