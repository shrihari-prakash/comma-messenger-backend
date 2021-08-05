const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const cryptUtil = require("./crypt");
const crypt = new cryptUtil.crypt();

function tokenManager() {
  this.generate = (db, userId, cacheManager) => {
    if (typeof userId === "object") {
      userId = userId.toString();
    }
    console.log("Generating authentication token for user: ", userId);
    return new Promise((resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));
      let insertToken = "CM_" + token(125);

      let tokenObject = {
        user_id: ObjectId(userId),
        token: "CM_" + crypt.encrypt(insertToken),
        date_added: now,
        date_expiry: tomorrow,
      };

      db.collection("tokens").insertOne(
        tokenObject,
        { w: 1 },
        function (err) {
          if (err) reject(err);

          cacheManager.putUserToken(
            userId,
            insertToken + ":" + tokenObject._id.toString() //Cache token format - token:token_id
          );
          resolve(insertToken);
        }
      );
    });
  };

  this.verify = async (db, userId, token, cacheManager) => {
    return new Promise(async (resolve, reject) => {
      let now = new Date();
      let tomorrow = new Date(new Date().setDate(now.getDate() + 1));

      //If the user id is stored in cache directly retreive it.
      let cacheToken = cacheManager.getTokenFromUserId(userId);

      if (cacheToken && cacheToken.split(":")[0] === token) {
        //If the token validation is success, we bump up the token expiry time to one more day so that the user stays logged in.
        db.collection("tokens").updateOne(
          { _id: ObjectId(cacheToken.split(":")[1]) }, //Cache token format - token:token_id
          { $set: { date_expiry: tomorrow } }
        );

        return resolve(userId);
      } else {
        if (ObjectId.isValid(userId) === false) return resolve(false);

        let tokenObjects = await db
          .collection("tokens")
          .find({ user_id: ObjectId(userId) })
          .toArray();

        if (!tokenObjects) {
          console.log("No valid token was matched for the given request.");
          return resolve(false);
        }

        //Because an user might have multiple sessions active in multiple devices.
        let tokenObject;

        tokenObject = tokenObjects.find((tokenObj) => {
          try {
            return token === crypt.decrypt(tokenObj.token.slice(3)); //Remove 'CM_' before decrypting.
          } catch (e) {
            console.error(e);
            return false;
          }
        });

        if (!tokenObject) return resolve(false);

        if (tokenObject.date_expiry < new Date()) return resolve(false);

        await db
          .collection("tokens")
          .updateOne(
            { token: tokenObject._id },
            { $set: { date_expiry: tomorrow } }
          );

        cacheManager.putUserToken(
          tokenObject.user_id.toString(),
          token + ":" + tokenObject._id.toString()
        );
        resolve(tokenObject.user_id.toString());
      }
    });
  };

  this.getIdFromToken = async (db, userId, token) => {
    return new Promise(async (resolve, reject) => {
      if (ObjectId.isValid(userId) === false) return resolve(false);

      let tokenObjects = await db
        .collection("tokens")
        .find({ user_id: ObjectId(userId) })
        .toArray();

      if (!tokenObjects) {
        console.log("No valid token was matched for the given request.");
        return resolve(false);
      }

      //Because an user might have multiple sessions active in multiple devices.
      let tokenObject;

      tokenObject = tokenObjects.find((tokenObj) => {
        try {
          return token === crypt.decrypt(tokenObj.token.slice(3)); //Remove 'CM_' before decrypting.
        } catch (e) {
          console.log(e);
          return false;
        }
      });

      if (!tokenObject) return resolve(false);

      resolve(tokenObject);
    });
  };
}

//function code taken from https://stackoverflow.com/a/34387027/12466812
function token(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex") // convert to hexadecimal format
    .slice(0, len)
    .toUpperCase(); // return required number of characters
}

module.exports = new tokenManager();
module.exports.tokenManager = tokenManager;
