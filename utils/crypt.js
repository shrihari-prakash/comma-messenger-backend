// Nodejs encryption with CTR
const crypto = require("crypto");
const algorithm = "aes-256-cbc";

const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/.env" });

const key = process.env.CRYPT_KEY.slice(0, 32);
const iv = process.env.CRYPT_IV.slice(0, 16);

function crypt() {
  this.encrypt = (text) => {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString("hex");
  }

  this.decrypt = (text) => {
    let encryptedText = Buffer.from(text, "hex");
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

module.exports = new crypt();
module.exports.crypt = crypt;