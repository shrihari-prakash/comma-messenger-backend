const MongoClient = require("mongodb").MongoClient;

var _db;
var _client;

module.exports = {
  connectToServer: function (callback) {
    MongoClient.connect(
      process.env.MONGO_HOST,
      { useUnifiedTopology: true },
      function (err, client) {
        _db = client.db(process.env.NODE_ENV == "test" ? process.env.MONGO_DB_NAME_TEST : process.env.MONGO_DB_NAME);
        _client = client;
        return callback(err);
      }
    );
  },

  getDb: function () {
    return _db;
  },
  getClient: function () {
    return _client;
  }
};
