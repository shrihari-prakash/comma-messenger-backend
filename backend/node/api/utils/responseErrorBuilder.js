module.exports = {
  buildReason: function (reasonType, reasonEntity) {
    let _reason = "";

    switch (reasonType) {
      case "empty":
        _reason = "NO_" + reasonEntity;
        break;
      case "invalid":
        _reason = "INVALID_" + reasonEntity;
        break;
      case "notFound":
        _reason = "NO_" + reasonEntity;
        break;
      case "unauthorized":
        _reason = "UNAUTHORIZED";
        break;
      case "isr":
        _reason = "INTERNAL_SERVER_ERROR";
        break;
      default:
        _reason = "UNKNOWN_ERROR";
        break;
    }
    return _reason;
  },

  buildInsight: function (insightType, insightEntity) {
    let _insight = "";

    switch (insightType) {
      case "empty":
        _insight = "No " + insightEntity + " was provided in the request.";
        break;
      case "invalid":
        _insight = "The given " + insightEntity + " is invalid.";
        break;
      case "notFound":
        _insight = "The given " + insightEntity + " does not exist.";
        break;
      case "unauthorized":
        _insight = "You are not authorized to performed this action.";
        break;
      case "isr":
        _insight = insightEntity;
        break;
      default:
        _insight = "An unknown error occured while processing your request.";
        break;
    }
    return _insight;
  },
};
