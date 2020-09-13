// Nodejs encryption with CTR
const crypto = require("crypto");
const fs = require("fs")
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

try {
  fs.writeFileSync("master-key.txt", `key: ${key.toString('hex')}\niv: ${iv.toString('hex')}`);
} catch (err) {
  console.error(err);
}
