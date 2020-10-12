var errors = {};
var util = require("util");

function ApiError(
  httpCode /* #Number */,
  httpMessage /* "String" */,
  description /* "String" */
) {
  this.httpCode = httpCode;
  this.httpMessage = httpMessage;
  this.description = description;
  this.details = null;
}

// Inherit the Error class
util.inherits(ApiError, Error);

// Exporting error Object
module.exports = errors;
errors.ApiError = ApiError;
ApiError.prototype.withDetails = function (details) {
  this.details = details;
  return this;
};

//--------------------- GENERIC ERRORS -------------------------/
errors.required_key = new ApiError(
  400,
  "REQUIRED_KEY",
  "Api key is required. Please provide a valid api key along with request."
);
errors.required_auth = new ApiError(
  400,
  "REQUIRED_AUTH_TOKEN",
  "Auth Token is required. Please provide a valid auth token along with request."
);
errors.internal_error = new ApiError(
  500,
  "INTERNAL_SERVER_ERROR",
  "Something went wrong on the server. Please report this error to the maintainer."
);
errors.invalid_key = new ApiError(
  401,
  "INVALID_KEY",
  "Valid api key is required. Please provide a valid api key along with request."
);
errors.invalid_auth = new ApiError(
  401,
  "INVALID_AUTH",
  "Valid auth token is required. Please provide a valid auth token along with request."
);
errors.invalid_permission = new ApiError(
  401,
  "INVALID_PERMISSION",
  "Permission denied. Current user does not has required permissions for this resource."
);
errors.invalid_access = new ApiError(
  401,
  "INVALID_ACCESS",
  "Access denied. Current user does not has access for this resource."
);
errors.invalid_input = new ApiError(
  400,
  "INVALID_INPUT",
  "The request input is not as expected by API. Please provide valid input."
);
errors.input_too_large = new ApiError(
  400,
  "INPUT_TOO_LARGE",
  "The request input size is larger than allowed."
);
errors.invalid_input_format = new ApiError(
  400,
  "INVALID_INPUT_FORMAT",
  "The request input format is not allowed."
);
errors.invalid_operation = new ApiError(
  403,
  "INVALID_OPERATION",
  "Requested operation is not allowed due to applied rules. Please refer to error details."
);
errors.not_found = new ApiError(
  404,
  "NOT_FOUND",
  "The resource referenced by request does not exists."
);
errors.not_registeration = new ApiError(
  404,
  "NOT_REGISTERATION",
  "User not registered with this email/mobile."
);

//--------------- SOME OTHERS LOGIC ERRORS -------------------/
errors.invalid_key = new ApiError(
  403,
  "INVALID_API_KEY",
  "The API key provided in the request has either expired or does not exist. Please provide a valid authorization key"
);
errors.could_not_get_access_token = new ApiError(
  403,
  "INVALID_OPERATION",
  "Error in getting access token from auth0"
);
errors.duplicate_entity = new ApiError(
  400,
  "DUPLICATE_ENTITY",
  "The provided entity already exists."
);
errors.bad_request = new ApiError(403, "INVALID_OPERATION", "Bad Request");
