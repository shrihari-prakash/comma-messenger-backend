module.exports = {
    'errorResponse': function (errorObj) {
    this.status=errorObj.httpCode;
    this.error = errorObj.httpMessage;
    this.insight = errorObj.description;
    this.additional_details = errorObj.details ? errorObj.details:null;
   },
  };