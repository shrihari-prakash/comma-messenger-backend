# comma-js REST API documentation

## Auth:

#### Request URL: 
localhost:26398/api/rest/v1/auth/google

#### Request Method: GET (Redirect)

#### Response Parameters: 

```
 "status": "SUCCESS",
 "message": "Login success.",
 "user_data": {
   "_id": "logged_in_user_id",
   "name": {
     "familyName": "Doe",
     "givenName": "John"
   },
   "email": "johndoe@example.com",
   "display_picture": "https://lh3.googleusercontent.com/a-/profile-image"
 },
 "token": "API_TOKEN"
```

The response is a redirect to the original page with the above values as get parameters. 

**NOTE:** status, message and token are typical get key - value pairs, whereas user_data is an object that is URL encoded.

_This login token must be stored in a cookie or local storage and should be sent along with all subsequent API calls as Authorization header._

### Subsequent Header Format:

`authorization`: `Bearer API_TOKEN`

## Threads
### List all user threads:

#### Request URL: 
localhost:26398/api/rest/v1/threads/getThreads

#### Request Method: GET

#### Request Parameters: 

```
limit: 10
offset: 0
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Threads Retrieved.",
    "result": [
        {
            "_id": "thread_1",
            "thread_participants": [
                {
                    "_id": "user_1",
                    "name": {
                        "familyName": "Doe",
                        "givenName": "Johhn"
                    },
                    "email": "johndoe@example.com"
                },
                {
                    "_id": "user_2",
                    "name": {
                        "familyName": "Doe",
                        "givenName": "Monica"
                    },
                    "email": "monicadoe@example.com"
                }
            ],
            "date_created": "2020-07-31T18:36:50.386Z",
            "date_updated": "2020-08-22T16:44:43.538Z",
            "new_for": [user_1]
        }
    ]
}
```

_The `new_for` parameter specifies for which users, the unread indicator should be shown for any given thread._

### Create a new thread:

#### Request URL: 
localhost:26398/api/rest/v1/threads/newThread

#### Request Method: GET

#### Request Parameters: 

```
email: monicadoe@example.com
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Thread created.",
    "thread_id": "thread_1"
}
```

## Tabs
### List all tabs for a given thread:

#### Request URL: 
localhost:26398/api/rest/v1/threads/getTabs

#### Request Method: GET

#### Request Parameters: 

```
thread_id: thread_1
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Tabs Retrieved.",
    "result": [
        {
            "_id": "tab_1",
            "tab_name": "personal",
            "thread_id": "thread_1",
            "is_secured": true,
            "date_created": "2020-07-31T18:37:33.566Z"
        },
        {
            "_id": "tab_2",
            "tab_name": "party",
            "thread_id": "thread_1",
            "is_secured": false,
            "date_created": "2020-08-02T14:36:52.963Z"
        }
    ]
}
```

### Create a new tab:

#### Request URL: 
localhost:26398/api/rest/v1/threads/newThread

#### Request Method: POST

#### Request Body: 

```
{
    "thread_id": "thread_1",
    "tab_name": "new_tab",
    "is_secured": true
}
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Tab created.",
    "thread_id": "tab_1"
}
```

### Rename tab:

#### Request URL: 
localhost:26398/api/rest/v1/threads/newThread

#### Request Method: PUT

#### Request Body: 

```
{
    "tab_id": "tab_1",
    "name": "new_name"
}
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Tab renamed."
}
```

### Lock/Unlock a tab:

#### Request URL: 
localhost:26398/api/rest/v1/threads/changeTabAuthStatus

#### Request Method: POST

#### Request Body: 

```
{
    "tab_id": "tab_1",
    "require_authentication": false,
    "password" : "0000" //Required only while unlocking tabs.
}
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Tab unlocked.",
}
```

## Messages
### Get all messages for a given tab:

#### Request URL: 
localhost:26398/api/rest/v1/threads/getMessages

#### Request Method: GET

#### Request Parameters: 

```
tab_id: tab_1
limit: 10
offset: 0
password: 0000 (Optional)
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Messages Retrieved.",
    "result": [
        {
            "messages": [
              {
                        "_id": "5f4140d80833030fb041b86a",
                        "sender" : "sender_1",
                        "type" : "text",
                        "content" : "Hey there!",
                        "date_created" : ISODate("2020-07-31T18:51:21.547Z")
                },
                {
                        "_id": "5f4140d80833030fb041b86b",
                        "sender" : "sender_2",
                        "type" : "image",
                        "file_name" : "0123456789.png",
                        "date_created" : ISODate("2020-07-31T18:53:38.766Z")
                }
            ],
            "seen_status": [
            {
                "user_id": "sender_1",
                "last_read_message_id": null //This user never read any message from the tab.
            },
            {
                "user_id": "sender_2",
                "last_read_message_id": "5f4140d80833030fb041b86a"
            }
        ]
        }
    ]
}
```

## Profile
### Change profile info:

#### Request URL: 
localhost:26398/api/rest/v1/threads/editProfileInfo

#### Request Method: PUT

#### Request Body: 

```
{
    "name": {
        "givenName": "John",
        "familyName": "Doe",
    },
    "display_picture": "image_url",
    "change_tab_password": {
        "existing": "0000",
        "changed": "0000"
    }
}
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Profile info changed."
}
```

## Realtime Messaging:
### Making a connection:

#### Client socket object format: 
```
var socket = io("http://localhost:26398", {
      path: "/api/socket/communicate",
    });
```

#### Connecting:
```
function connect() {
      socket.emit("_connect", {
        token: "Bearer API_TOKEN",
      });
    }
```
The connection will be accepted or rejected based on the API token sent.

#### Sending a message:
```
    function sendMessage() {
      socket.emit("_messageOut", {
        id: "Current unix timestamp recommended. This id will be sent back on callback to let the front end know if the message was delivered or rejected.",
        token: "Bearer API_TOKEN",
        type: "text",
        tab_id: "tab_1",
        content: "Hello",
        password: "1234",
      });
    }
```

#### Getting the status of the sent message:
```
    socket.on("_success", function (data) {
      console.log(data)
    });
    
    socket.on("_error", function (data) {
      console.log(data)
    });
```

#### Receiving messages:
```
    socket.on("_messageIn", function (message) {
      console.log(message)
    });
```
