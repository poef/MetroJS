# MetroJS: HTTPS Client with middleware

[![Project stage: Concept][project-stage-badge: Concept]][project-stage-page]

```javascript
import * as metro from '@muze-nl/metro'

const client = metro.client({
  url: 'https://github.com/'
}).with((req,next) => {
  req = req.with({
    headers: {
      'Content-Type':'application/json',
      'Accept':'application/json'
    }
  })
  if (typeof req.body == 'object') {
    req = req.with({
      body: JSON.stringify(req.body)
    })
  }
  let res = await next(req)
  let body = await res.json()
  return res.with({ body })
})
```

MetroJS is an HTTPS client with support for middleware. Similar to [ExpressJS](https://expressjs.com/), but for the client.

You add middleware with the `with()` function, as shown above.

The signature for a middleware function is:

```javascript
(request, next) => {
   // alter request
   let response = await next(request)
   // alter response
   return response
}
```

However, both request and response are immutable. You can not change them. You can 
however create a copy with some values different, using the `with()` function.

Both metro.request() and metro.response() are compatible with the normal Request 
and Response objects, used by the Fetch API. Any code that works with those, will work
with the request and response objects in MetroJS.

## Install / Usage

```bash
npm install @muze-nl/metro
```

In the browser, using a cdn:
```html
<script src="https://cdn.jsdelivr.net/npm/@muze-nl/metro@0.1.0/dist/browser.js"></script>
<script>
  async function main() {
    const client = metro.client('https://example.com/')
    const result = await client.get('folder/page.html')
  }
  main()
</script>
```

Using ES6 modules, in the browser or Node:
```javascript
import * as metro from '@muze-nl/metro'

async function main() {
  const client = metro.client('https://example.com/')
  const result = await client.get('folder/page.html')
}
```

## Using middleware
A middleware is a function with `(request, next)` as parameters, returning a `response`.
Both request and response adhere to the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
[Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and 
[Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) standard.

`next` is a function that takes a `request` and returns a `Promise<Response>`. This function is defined by MetroJS
and automatically passed to your middleware function. The idea is that your middleware function can change the request
and pass it on to the next middleware or the actual fetch() call, then intercept the response and change that and return it:

```
async function myMiddleware(req,next) {
  req = req.with('?foo=bar')
  let res = await next(req)
  if (res.ok) {
    res = res.with({headers:{'X-Foo':'bar'}})
  }
  return res
}
```

Both request and response have a `with` function. This allows you to create a new request or response, from 
the existing one, with one or more options added or changed. The original request or response is not changed.

## Debugging

Middleware is powerful, but can also be difficult to debug. For this reason MetroJS adds a trace feature. This 
allows you to add a request and response tracer function, which is called before and after each middleware call:

```
const client = metro.client()
metro.trace.add('mytracer', {
  request: (req) => {
    console.log('request',req)
  },
  response: (res) => {
    console.log('response',res)
  }
})
```

There is a default trace function that shows the call request/response in a nested fashion:

```
metro.trace.add('group', metro.trace.group())
```

## Creating middleware

You can just create a async function with `(req,next) => res` as its signature. But often it is important
to be able to set options specific for that middleware. The best way to do this is to create a module like
so:

```
export default function myMiddleware(options)
{
  return async (req,next) => {
    // alter request, using options
    let res = await next(req)
    // alter response, using options
    return res
  }
}
```

See for example the [jsonmw](src/mw/json.mjs) middleware.

## metro.assert

For more complex middleware code, it can be very helpful to check any number of preconditions and give 
helpful error messages to developers. However, in production such code only slows down the experience, and the
error messages don't mean anything to normal users. For this use MetroJS includes a simple assert module. This
allows you to add assertions, which only get checked if it is enabled. Something that a developer can decide to
do while developing code using your middleware.

To use this in your middleware code, do this:

```javascript
import * as metro from '@muze-nl/metro'
import * as assert from '@muze-nl/metro/src/assert.mjs'

export default function myMiddleware(options) {

  assert.check(options, {
    'foo':'bar',
    'bar':assert.optional(assert.oneOf('bar','baz')),
    'baz':/b.+/
  })

  return async (req,next) => {

    assert.check(req.headers, {
      'X-Foo':'bar'
    }

    return await next(req)
  }
}
```

A developer may now enable assertion checking by calling `assert.enable()`:

```
import * as metro from '@muze-nl/metro'
import * as assert from '@muze-nl/metro/src/assert'

async function main() {
  const client = metro.client(myMiddleware(options))
  assert.enable()
  let result = await client.get('foo/')
}
```

If any assertion fails, it will throw an Error with a list of assertions that failed.



[project-stage-badge: Concept]: https://img.shields.io/badge/Project%20Stage-Concept-red.svg
[project-stage-page]: https://blog.pother.ca/project-stages/
