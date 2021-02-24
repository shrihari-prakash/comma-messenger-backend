const tokenMgr = require("../../../utils/tokenManager");
const tokenManager = new tokenMgr.tokenManager();

const errors = require("../../../utils/errors");
const errorModel = require("../../../utils/errorResponse");

module.exports = async (req, res, next) => {
  try {
    //Start of input validation.
    if (!req.header("authorization")) {
      let error = new errorModel.errorResponse(errors.invalid_key);
      return res.status(403).json(error);
    }

    let authToken = req
      .header("authorization")
      .slice(7, req.header("authorization").length)
      .trimLeft();

    if (!authToken) {
      let error = new errorModel.errorResponse(errors.invalid_key);
      return res.status(403).json(error);
    }

    let headerUserId = req.header("x-cm-user-id");

    if (!headerUserId) {
      let error = new errorModel.errorResponse(errors.invalid_key);
      return res.status(403).json(error);
    }

    let cacheManager = req.app.get("cacheManager");

    let db = req.app.get("mongoInstance");

    let loggedInUserId = await tokenManager.verify(
      db,
      headerUserId,
      authToken,
      cacheManager
    );

    if (!loggedInUserId) {
      let error = new errorModel.errorResponse(errors.invalid_key);
      return res.status(403).json(error);
    }
    next();
  } catch (err) {
    console.log(err);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
};
