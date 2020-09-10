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
        const currentUser = await insertUser(db, user1);
        common.apiToken = currentUser[1];

        //set email for other user in the system to test chats.
        const user2 = createFakeUser();
        const receivingUser = await insertUser(db, user2);
        common.receiverEmail = receivingUser[0].email;

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
  let name = faker.name.findName();
  return {
    name: {
      givenName: name.split(" ")[0],
      familyName: name.split(" ")[1],
    },
    email: faker.internet.email(),
    display_picture: "https://picsum.photos/200", //Random image url.
    threads: [],
    master_password: null,
    tab_password: null,
  };
}
