# NodeJS API Server

Pure NodeJS API server with zero modules or frameworks. This is a simple app, probably not suitable in production without modification.

## To Start

Before you begin, please create certificate/key .pem files and place them in a top level directory called `https`. Without these the HTTPS server will not start.

Then execute

```
node index.js
```

## Inner Workings

I personally use a service like Postman to test the app.

Any endpoint that requires auth must have a `token` header with a valid token for your user.

### Users

`POST /users` - Creates a new user. Payload is JSON with the structure:

```
{
  phone: '1234567890',
  firstName: 'John',
  lastName: 'Smith',
  password: 'achosenpassword',
  tosAgreement: true // Must be true to continue
}
```

`GET /users?phone=XXXX` - **(requires auth)** Pulls up a user's details. Users are identified by their phone number.

`PUT /users` - **(requires auth)** Updates user's details. Payload must include `phone` and at least one field to be updated (see `POST /users` for examples).

`DELETE /users?phone=XXXX` - **(requires auth)** Deletes the given user.

### Tokens

`POST /tokens` - Creates a new token for a user. Payload is JSON with the structure:

```
{
  phone: '1234567890',
  password: 'achosenpassword',
}
```

`GET /tokens?id=XXXX` - Retrieves the details of a token.

`PUT /tokens` - Extends the life of a token. Tokens expire 60 minutes after creation unless extended. Payload is JSON with the structure:

```
{
  id: 'XXXXXX',
  extend: true
}
```

`DELETE /tokens?id=XXXX` - Deletes the given token.

### Checks

`POST /checks` - **(requires auth)** Creates a new check for a user. Returns details of new check, including an ID. A user can only have five checks stored against them at one time. Payload is JSON with the structure:

```
{
  protocol: 'http',       // OR 'https'
  url: 'example.com',     // Can include query string
  method: 'get',          // OR put/post/delete
  successCodes: [200],    // Array of successful response codes
  timeoutSeconds: 3       // Min 1s, max 5s
}
```

`GET /checks?id=XXXX` - **(requires auth)** Retrieves the details of a check.

`PUT /checks` - **(requires auth)** Change information in a check. JSON payload must include `id` field, plus one or more check fields (see `POST /checks` for structure)

`DELETE /checks?id=XXXX` - **(requires auth)** Deletes the given check.
