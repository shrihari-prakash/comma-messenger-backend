const { ObjectId } = require("mongodb");
const crypto = require("crypto");

function tokenManager() {
  this.generate = (db, userId, cacheManager) => {
    if (typeof userId === "object") {
      userId = userId.toString();
    }
    console.log("Generating authentication token for user id: ", userId);
    return new Promise((resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
      let insertToken = "CM_" + token(125);

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
        console.log(
          "User " + userId + "'s token has been verified from cache."
        );
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
          console.log("No valid token was matched for the given request.");
          return resolve(false);
        }

        if (tokenObject.date_expiry < new Date()) return resolve(false);

        await db
          .collection("tokens")
          .updateOne(
            { token: tokenObject._id },
            { $set: { date_expiry: tomorrow } }
          );

        console.log(
          "User " +
            tokenObject.user_id +
            "'s token has been verified from database."
        );
        cacheManager.putUserToken(token, tokenObject.user_id.toString());
        resolve(tokenObject.user_id.toString());
      }
    });
  };
}

//function code taken from http://blog.tompawlak.org/how-to-generate-random-values-nodejs-javascript
function token(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex") // convert to hexadecimal format
    .slice(0, len)
    .toUpperCase(); // return required number of characters
}

module.exports = new tokenManager();
module.exports.tokenManager = tokenManager;
