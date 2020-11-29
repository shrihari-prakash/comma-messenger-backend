exports.runCleanUp = (db) => {
  //Clean messages older than 30 days.
  db.collection("messages").remove({
    date_created: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  });
};
