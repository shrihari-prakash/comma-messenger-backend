const MongoClient = require("mongodb").MongoClient;
const userMgr = require("./dbUtils/userManager");
const userManager = new userMgr.userManager();

function tokenManager() {
  var randomizer = function () {
    return Math.random().toString(36).substr(2); // remove `0.`
  };

  var dateHash = function () {
    return (+new Date()).toString(36);
  };

  var token = function () {
    return randomizer() + randomizer() + randomizer() + "_" + dateHash();
  };

  this.generate = (userId, cacheManager) => {
    return new Promise((resolve, reject) => {
      MongoClient.connect(
        "mongodb://" + process.env.MONGO_HOST,
        { useUnifiedTopology: true },
        async function (err, client) {
          if (err) reject(err);

          var db = client.db("comma");

          let now = new Date();
          let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
          let insertToken = token();

          let tokenObject = {
            user_id: userId,
            token: insertToken,
            date_added: now,
            date_expiry: tomorrow,
          };

          db.collection("tokens").insertOne(tokenObject, { w: 1 }, function (
            err,
            result
          ) {
            if (err) reject(err);
            client.close();
            cacheManager.putUserToken(insertToken, userId);
            resolve(insertToken);
          });
        }
      );
    });
  };

  this.verify = (token, cacheManager) => {
    return new Promise((resolve, reject) => {
      let userId = cacheManager.getUserIdFromToken(token);

      if (userId) {
        resolve(userId);
      } else {
        MongoClient.connect(
          "mongodb://" + process.env.MONGO_HOST,
          { useUnifiedTopology: true },
          async function (err, client) {
            if (err) reject(err);

            var db = client.db("comma");

            db.collection("tokens").findOne({ token: token }, function (
              err,
              tokenObject
            ) {
              if (err) reject(err);
              else {
                if (!tokenObject) {
                  resolve(false);
                } else {
                  let now = new Date();
                  let tomorrow = new Date(
                    new Date().setDate(now.getDate() + 1)
                  );
                  db.collection("tokens").updateOne(
                    { _id: tokenObject._id },
                    { $set: { date_expiry: tomorrow } },
                    function (err) {
                      if (err) resolve(false);
                      else resolve(tokenObject);
                    }
                  );
                }
              }
            });
          }
        );
      }
    });
  };
}

module.exports = new tokenManager();
module.exports.tokenManager = tokenManager;
