function userManager() {
  this.checkExistingUser = function (db, email) {
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
}

module.exports = new userManager();
module.exports.userManager = userManager;
