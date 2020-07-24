const cache = require("memory-cache");

function cacheManager() {
  var userTokenCache = null;

  this.init = () => {
    try {
      userTokenCache = new cache.Cache();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  this.putUserToken = (token, userId) => {
    userTokenCache.put(token, userId, 21600000, function (key, value) {
      console.log("Cache data `" + key + " : " + value + "` has expired.");
    }); //Expiry time in ms
    return true;
  };

  this.getUserIdFromToken = (token) => {
    let userId = userTokenCache.get(token);
    return userId;
  };
}

module.exports = new cacheManager();
module.exports.cacheManager = cacheManager;