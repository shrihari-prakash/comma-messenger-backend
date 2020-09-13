# comma-js-server
![Comma JS Logo](/branding-assets/logo.png)

Open source messenger based on Express, MongoDB and Socket.IO

**Is this another 'chat' application built based on YouTube examples? NO**

**Ok it's not that, so how does it standout?**
* Integrated Google Single Sign On for one-click user creation and login.💻
* Mini-Conversations inside threads - This means users have the ability have sub conversations inside threads. Think of a conversation like a browser window with multiple tabs open! 💭
* Lock parts of conversations instead of locking the whole application! Each tab in a thread are renamable and password-protectable! 🔐
* Notifications support. 🔔

**How to Run?**

**Backend:**
* `cd backend\node\api\`
* Install all the dependencies by running `npm install`.
* Execute command `npm start app.js`.
* Comma JS server should now be running on port `26398`.

**Sample `.env` file:**

```
#Google App credentials
GOOGLE_CLIENT_ID=YourGoogleClientID
GOOGLE_CLIENT_SECRET=YourGoogleClientSecret

#express session secret
SESSION_SECRET=YourSessionSecret

#MongoDB
MONGO_HOST=mongodb://localhost:27017
MONGO_DB_NAME=comma
MONGO_DB_NAME_TEST=comma_test

#URL of client web page
CLIENT_URL=http://127.0.0.1:5501

#URL of server
SERVER_URL=http://127.0.0.1:26398

#Encryption
CRYPT_KEY=YourEncryptionKey
CRYPT_IV=YourEncryptionIV

#vapidKeys for push notifications
VAPID_PUBLIC_KEY=YourVapidPublicKey
VAPID_PRIVATE_KEY=YourVapidPrivateKey

#TEST
API_PATH=/api/rest/v1
MONGO_OBJECT_ID_LENGTH=24
```

**API Documentation:**

The REST and Socket API documentation can be found **[HERE](backend/node/api/docs/api_docs.md)**

**Samples:**
* Sample frontend implementations for important pieces of backend can be found in the `demos` folder.
* Run the demo files on `live server` exstension for VS Code or any other server that runs on port 5501.

**Frontend:**
**[comma-js-frontend](https://github.com/ronaldlanton/comma-js-frontend)**
