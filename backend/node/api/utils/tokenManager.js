const { ObjectId } = require("mongodb");

function tokenManager() {
  this.generate = (db, userId, cacheManager) => {
    if (typeof userId === "object") {
      userId = userId.toString();
    }
    return new Promise((resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
      let insertToken = token();

      let tokenObject = {
        user_id: ObjectId(userId),
        token: insertToken,
        date_added: now,
        date_expiry: tomorrow,
      };

      db.collection("tokens").insertOne(tokenObject, { w: 1 }, function (
        err,
        result
      ) {
        if (err) reject(err);
        cacheManager.putUserToken(insertToken, userId);
        resolve(insertToken);
      });
    });
  };

  this.verify = async (db, token, cacheManager) => {
    return new Promise(async (resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));

      //If the user id is stored in cache directly retreive it.
      let userId = cacheManager.getUserIdFromToken(token);

      if (userId) {
        //If the token validation is success, we bump up the token expiry time to one more day so that the user stays logged in.
        db.collection("tokens").updateOne(
          { token: token },
          { $set: { date_expiry: tomorrow } }
        );

        resolve(userId);
      } else {
        let tokenObject = await db
          .collection("tokens")
          .findOne({ token: token });

        if (!tokenObject) {
          return resolve(false);
        }

        if (tokenObject.date_expiry < new Date()) return resolve(false);

        await db
          .collection("tokens")
          .updateOne(
            { token: tokenObject._id },
            { $set: { date_expiry: tomorrow } }
          );

        cacheManager.putUserToken(token, tokenObject.user_id.toString());
        resolve(tokenObject.user_id.toString());
      }
    });
  };
}

function randomizer() {
  return Math.random().toString(36).substr(2); // remove `0.`
}

function dateHash() {
  return (+new Date()).toString(36);
}

function token() {
  return randomizer() + randomizer() + randomizer() + "_" + dateHash();
}

module.exports = new tokenManager();
module.exports.tokenManager = tokenManager;
