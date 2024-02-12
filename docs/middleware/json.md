# JSON middleware

The `jsonmw()` middleware allows you to automatically parse and stringify javascript data when sending or receiving data.

## Usage

```javascript
import * as metro from '@muze-nl/metro'
import jsonmw from '@muze-nl/metro/src/mw/json.mjs'

const client = metro.client().with( jsonmw() )
```

Then to send and receive data:

```javascript
let response = await client.post(url, {
	some: 'data'
})
let result
if (response.ok) {
	result = response.body.something
}
```

The `jsonmw` middelware will automatically add the `Accept: application/json` header to your requests.

If the HTTP request supports a body, as in `POST`, `PUT`, `PATCH` and `QUERY`, it will also add the `Content-Type: application/json` header. Any data send as the body of the request, will be turned into json. 

The body of the response is automatically parsed as json.

