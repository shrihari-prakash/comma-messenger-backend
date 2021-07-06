module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "no-unused-vars": "warn"
    },
    "overrides": [
        {
          "files": [
            "**/*.spec.js",
            "**/*.spec.jsx"
          ],
          "env": {
            "jest": true
          }
        }
      ]
};
