const faker = require("faker");

const common = require("./common");

const tokenMgr = require("../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const cache = require("../utils/cacheManager");
const cacheManager = new cache.cacheManager();

const mongoConnector = require("../utils/dbUtils/mongoConnector");

module.exports = {
  mockUser: () => {
    return new Promise((resolve, reject) => {
      mongoConnector.connectToServer(async function (err, client) {
        if (err) console.log(err);
        let db = mongoConnector.getDb();

        //set API token for user sending API requests.
        const user1 = createFakeUser();
        const userOne = await insertUser(db, user1);
        common.user1.apiToken = userOne[1];
        common.user1.email = userOne[0].email;
        common.user1._id = userOne[0]._id;

        //set email for other user in the system to test chats.
        const user2 = createFakeUser();
        const userTwo = await insertUser(db, user2);
        common.user2.apiToken = userTwo[1];
        common.user2.email = userTwo[0].email;
        common.user2._id = userTwo[0]._id;

        resolve(true);
      });
    });
  },
  truncateDatabase: () => {
    mongoConnector.connectToServer(function (err, client) {
      if (err) console.log(err);
      let db = mongoConnector.getDb();

      db.dropDatabase();
    });
  },
};

function insertUser(db, user) {
  return new Promise((resolve, reject) => {
    db.collection("users").insertOne(user, { w: 1 }, function (err, result) {
      if (err) throw err;
      let insertedUserId = user._id;

      cacheManager.init();

      tokenManager
        .generate(db, insertedUserId, cacheManager)
        .then((insertToken) => {
          resolve([user, insertToken]);
          return;
        });
    });
  });
}

function createFakeUser() {
  let user = {
    name: {
      givenName: faker.name.firstName(),
      familyName: faker.name.lastName(),
    },
    email: faker.internet.email(),
    display_picture: faker.image.avatar(),
    threads: [],
    master_password: null,
    tab_password: null,
  };
  console.log(user);
  return user;
}
