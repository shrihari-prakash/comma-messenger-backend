const MongoClient = require("mongodb").MongoClient;

function tokenManager() {
  var randomizer = function () {
    return Math.random().toString(36).substr(2); // remove `0.`
  };

  var dateHash = function () {
    (+new Date()).toString(36); // "iepii89m"
  };

  var token = function () {
    return randomizer() + randomizer() + dateHash(); // to make it longer
  };

  var checkExistingUser = function (db, email) {
    return new Promise((resolve, reject) => {
      db.collection("users").findOne({ email: email }, function (err, user) {
        if (err) reject(err);
        else {
          if (!user) {
            resolve(false);
          } else {
            resolve(user);
          }
        }
      });
    });
  };

  this.generate = (emailId) => {
    // Connect to the db
    MongoClient.connect(
      "mongodb://" + process.env.MONGO_HOST,
      { useUnifiedTopology: true },
      async function (err, client) {
        if (err) throw err;

        var db = client.db("comma");

        checkExistingUser(db, email)
          .then((existingUser) => {
            if (typeof existingUser !== "boolean" && existingUser !== false) {

              let now = new Date();
              let insertToken = token();
              let tokenObject = {
                user_id: existingUser._id,
                token: insertToken,
                date_added: now,
                date_expiry: now.setDate(date.getDate() + 1),
              };

              db.collection("tokens").insertOne(
                tokenObject,
                { w: 1 },
                function (err, result) {
                  if (err) throw err;
                  client.close();
                  return insertToken;
                }
              );
              
            } else {
              return false;
            }
          })
          .catch((err) => {
            return false;
          });
      }
    );
  };
}
