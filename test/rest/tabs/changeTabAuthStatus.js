const common = require("../../common");
const chaiHttp = require("chai-http");

const chai = common.chai;
const server = common.server;
const expect = chai.expect;
const should = chai.should();

chai.use(chaiHttp);

const endPoint = process.env.API_PATH + "/tabs/changeTabAuthStatus";

it("Disable auth of a secured tab with valid password", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send({
      tab_id: common.objectIds.tabIds.withAuthentication,
      require_authentication: false,
      password: "1234",
    })
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      done();
    });
});

it("Disable auth of a secured tab with invalid password", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send({
      tab_id: common.objectIds.tabIds.withAuthentication,
      require_authentication: false,
      password: "0000",
    })
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(400);
      res.body.should.be.a("object");
      done();
    });
});

it("Enable auth of a secured tab", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send({
      tab_id: common.objectIds.tabIds.withAuthentication,
      require_authentication: true,
    })
    .set("Authorization", `Bearer ${common.user1.apiToken}`)
    .end((err, res) => {
      expect(res).to.have.status(200);
      res.body.should.be.a("object");
      done();
    });
});

it("Change tab auth status with invalid API key", function (done) {
  chai
    .request(server)
    .put(endPoint)
    .send({ email: process.env.TEST_RECEIVER_EMAIL })
    .set("Authorization", `Bearer SOME_API_KEY`)
    .end((err, res) => {
      expect(res).to.have.status(403);
      res.body.should.be.a("object");
      res.body.error.should.be.eql("INVALID_API_KEY");
      done();
    });
});
