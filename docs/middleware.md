# Middleware

## Using middleware

You can add middleware to a client using the client() function directly, or by calling with() on an existing client. This will return a new client with the middleware added:

```javascript
import jsonmw from '@muze-nl/metro/src/mw/jsonmw'
const client = metro.client( jsonmw() )
```

See the [reference]() for a list of [default middlewares]() available with MetroJS.

## Creating middleware

A middleware is a function with (request, next) as parameters, returning a response. Both request and response adhere to the Fetch API Request and Response standard.

next is a function that takes a request and returns a Promise<Response>. This function is defined by MetroJS and automatically passed to your middleware function. The idea is that your middleware function can change the request and pass it on to the next middleware or the actual fetch() call, then intercept the response and change that and return it:

```javascript
async function myMiddleware(req,next) {
  req = req.with('?foo=bar')
  let res = await next(req)
  if (res.ok) {
    res = res.with({headers:{'X-Foo':'bar'}})
  }
  return res
}
```

/Note/: Both request and response have a with function. This allows you to create a new request or response, from the existing one, with one or more options added or changed. The original request or response is not changed. See the [reference]() for more information.

