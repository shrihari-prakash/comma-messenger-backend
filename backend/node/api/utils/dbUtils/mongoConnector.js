const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://localhost:27017";

var _db;
var _client;

module.exports = {
  connectToServer: function (callback) {
    MongoClient.connect(
      process.env.MONGO_HOST,
      { useUnifiedTopology: true },
      function (err, client) {
        _db = client.db("comma");
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
