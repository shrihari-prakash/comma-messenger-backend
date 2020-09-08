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
    .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
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
      .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
      .end((err, res) => {
          console.log(res.body)
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
