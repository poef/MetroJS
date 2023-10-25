# MetroJS: HTTPS Client with middleware

```javascript
import * as metro from '@muze-nl/metro'

const client = metro.client({
  baseURL: 'https://github.com/'
}).with((req,next) => {
  req = req.with({
    headers: {
      'Content-Type':'application/json',
      'Accept':'application/json'
    }
  })
  if (typeof req.body == 'object') {
    req = req.with({
      body = JSON.stringify(req.body)
    })
  }
  let res = await next(req)
  let body = await res.json()
  return res.with({ body })
```

MetroJS is an HTTPS client with support for middleware. Just like ExpressJS.

You add middleware with the `with()` function, as shown above.

The signature for a middleware function is:

```javascript
(request, next) => {
   // alter request
   let response = await next(request)
   // alter response
   return response
```

However, both request and response are immutable. You can not change them. You can 
however create a copy with some values different, using the `with()` function.

Both metro.request() and metro.response() are compatible with the normal Request 
and Response objects, used by the Fetch API. Any code that works with those, will work
with the request and response objects in MetroJS.
