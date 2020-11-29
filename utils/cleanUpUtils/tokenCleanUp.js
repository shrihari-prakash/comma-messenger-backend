exports.runCleanUp = (db) => {
  //Clean token that have expired.
  db.collection("tokens").remove({
    date_expiry: { $lte: new Date() },
  });
};
