// Nodejs encryption with CTR
const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const key = process.env.CRYPT_KEY;
const iv = process.env.CRYPT_IV;
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/.env" });

function crypt() {
  this.encrypt = (text) => {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
  }

  this.decrypt = (text) => {
    let iv = Buffer.from(text.iv, "hex");
    let encryptedText = Buffer.from(text.encryptedData, "hex");
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

module.exports = new crypt();
module.exports.crypt = crypt;