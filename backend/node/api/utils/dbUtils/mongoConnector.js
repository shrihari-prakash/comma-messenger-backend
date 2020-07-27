const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://localhost:27017";

var _db;

module.exports = {
  connectToServer: function (callback) {
    MongoClient.connect(
      "mongodb://" + process.env.MONGO_HOST,
      { useUnifiedTopology: true },
      function (err, client) {
        _db = client.db("comma");
        return callback(err);
      }
    );
  },

  getDb: function () {
    return _db;
  },
};
