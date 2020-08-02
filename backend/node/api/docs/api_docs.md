# comma-js REST API documentation

## Auth:

#### Request URL: 
localhost:26398/api/rest/v1/auth/google

#### Request Method: GET (Redirect)

#### Response Parameters: 

```
{
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
}
```

_This login token must be stored in a cookie or local storage and should be sent along with all subsequent API calls as Authorization header._

### Subsequent Header Format:

`authorization`: `Bearer API_TOKEN`

## Threads
### List all user threads:

#### Request URL: 
localhost:26398/api/rest/v1/threads/getThreads

#### Request Method: GET

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
            "date_created": "2020-07-31T18:36:50.386Z"
        }
    ]
}
```

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
            "password_protected": 1,
            "date_created": "2020-07-31T18:37:33.566Z"
        },
        {
            "_id": "tab_2",
            "tab_name": "party",
            "thread_id": "thread_1",
            "password_protected": 0,
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
    "password": "0000" (Optional)
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
                        "sender" : "sender_1",
                        "type" : "text",
                        "content" : "Hey there!",
                        "date_created" : ISODate("2020-07-31T18:51:21.547Z")
                },
                {
                        "sender" : "sender_2",
                        "type" : "text",
                        "content" : "Hello!",
                        "date_created" : ISODate("2020-07-31T18:53:38.766Z")
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
    "display_picture": "image_url"
}
```

#### Sample Response: 

```
{
    "status": 200,
    "message": "Profile info changed."
}
```

