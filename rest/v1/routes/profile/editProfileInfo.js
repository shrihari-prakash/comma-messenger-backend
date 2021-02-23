const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

var ObjectId = require("mongodb").ObjectID;

const errors = require("../../../../utils/errors");
const errorModel = require("../../../../utils/errorResponse");

//An array of properties that an user is allowed to edit.
const editableProperties = [
  "name",
  "familyName",
  "givenName",
  "display_picture",
  "change_tab_password",
  "existing",
  "changed",
];

router.put("/", async function (req, res) {
  editProfileInfo(req, res);
});

async function editProfileInfo(req, res) {
  let db = req.app.get("mongoInstance");

  let loggedInUserId = req.header("x-cm-user-id");

  let userDetails = req.body;

  //We need to make sure the user does not edit things he is not supposed to edit. Say, his email,
  if (
    validateJSONProperties(userDetails) == false ||
    validateJSONSchema(userDetails) == false
  ) {
    let error = new errorModel.errorResponse(
      errors.invalid_input.withDetails(
        "No valid `profile object` was sent along with the request."
      )
    );
    return res.status(400).json(error);
  }

  try {
    if (userDetails.change_tab_password) {
      var userObject = await db
        .collection("users")
        .findOne({ _id: ObjectId(loggedInUserId) });

      let dbPassword = userObject.tab_password;

      if (dbPassword != null) {
        let passwordVerified = bcrypt.compareSync(
          userDetails.change_tab_password.existing,
          dbPassword
        );
        if (passwordVerified !== true) {
          let error = new errorModel.errorResponse(
            errors.invalid_input.withDetails(
              "Provided password does not match with the one on the system."
            )
          );
          return res.status(400).json(error);
        }
      }
      //Set the new password in the format that's present in the database and
      //remove the existing and current passwords in the user input.
      var salt = bcrypt.genSaltSync(10);
      let hash = bcrypt.hashSync(userDetails.change_tab_password.changed, salt);
      userDetails.tab_password = hash;
      delete userDetails.change_tab_password;
    }

    db.collection("users").updateOne(
      { _id: ObjectId(loggedInUserId) },
      { $set: userDetails },
      function (err, result) {
        if (err) throw err;
        return res.status(200).json({
          status: 200,
          message: "Profile info changed.",
        });
      }
    );
  } catch (e) {
    console.log(e);
    let error = new errorModel.errorResponse(errors.internal_error);
    return res.status(500).json(error);
  }
}

function validateJSONProperties(o) {
  let returnValue = true;
  Object.keys(o).forEach(function (k) {
    if (o[k] !== null && typeof o[k] === "object") {
      validateJSONProperties(o[k]);
    }
    if (typeof o[k] === "string") {
      if (!editableProperties.includes(k)) {
        returnValue = false;
        return false;
      }
    }
  });
  return returnValue;
}

/*Put any checks you need to do for validating the input JSON schema, in this case, the name given by Google when a user signs up is
an {object}. This object contains :givenName and :familyName keys.*/
function validateJSONSchema(userDetails) {
  try {
    if (userDetails.name) {
      if (!userDetails.name.familyName || !userDetails.name.givenName)
        return false;
    }
    if (userDetails.change_tab_password) {
      if (
        isEmptyOrSpaces(userDetails.change_tab_password.existing) ||
        userDetails.change_tab_password.existing.length < 4 ||
        isEmptyOrSpaces(userDetails.change_tab_password.changed) ||
        userDetails.change_tab_password.changed.length < 4
      ) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

module.exports = router;
