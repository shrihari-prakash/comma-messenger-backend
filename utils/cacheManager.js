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

  this.putUserToken = (userId, token) => {
    userTokenCache.put(userId, token, 21600000, function (key, value) {
      console.log("Cache data `" + key + " : " + value + "` has expired.");
    }); //Expiry time in ms
    return true;
  };

  this.getTokenFromUserId = (userId) => {
    console.log(userTokenCache._cache )
    let token = userTokenCache.get(userId);
    return token;
  };
}

module.exports = new cacheManager();
module.exports.cacheManager = cacheManager;
