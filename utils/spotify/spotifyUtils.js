const axios = require("axios").default;
const Querystring = require("querystring");

var tokenObject = null;

const getToken = () => {
  return new Promise((resolve, reject) => {
    if (tokenObject == null || tokenObject.expiry_date <= new Date()) {
      const basicAuthToken = Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64");

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + basicAuthToken,
      };

      let body = Querystring["stringify"]({
        grant_type: "client_credentials",
      });

      //Documentation: https://developer.spotify.com/documentation/general/guides/authorization-guide/#client-credentials-flow
      axios
        .post("https://accounts.spotify.com/api/token", body, {
          headers: headers,
        })
        .then(function (response) {
          tokenObject = response.data;
          let expiryDate = new Date();
          expiryDate.setTime(expiryDate.getTime() + 55 * 60 * 1000);
          tokenObject.expiry_date = expiryDate;
          resolve(tokenObject);
          console.log(tokenObject);
        })
        .catch(function (error) {
          console.log(error);
          reject(error);
        });
    } else {
      resolve(tokenObject);
    }
  });
};

const getTrackInfo = (trackId) => {
  return new Promise(async (resolve, reject) => {
    let apiToken = await getToken();

    const headers = {
      Authorization: "Bearer " + apiToken.access_token,
    };

    axios
      .get("https://api.spotify.com/v1/tracks/" + trackId, {
        headers: headers,
      })
      .then(function (response) {
        console.log(response.data);
        resolve(response.data);
      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });
  });
};

module.exports = {
  getToken: getToken,
  getTrackInfo: getTrackInfo,
};
