# Asserts

## Asserting preconditions

When writing middleware there is usually quite a lot of preconditions to check. When a developer wants to use your middleware, it is nice to have explicit feedback about what he or she is doing wrong. However this is only useful during development. Once in production you should assume that there are no developer mistakes anymore... or at least that the end user has no use for detailed error reports about your middleware.

This is especially true about mock middleware. Mock middleware is middleware that blocks the actual transmission of a request, and returns a mock response instead. Your browser doesn't actually fetch the requests URL.

The [oauth2 middleware]() for example, has unit tests that use the [oauth2 mock middleware]() to mimick a server. This way you can be sure that the oauth2 client implementation works, without having to setup a real oauth2 server anywhere.

Since these mock middleware servers are especially meant for the initial development of new middleware, they should assert as much as they can. And send comprehensive error messages to the console. Here the [`assert.fails()`](./reference/assert/fails.md) method comes in handy.

assert.fails() returns false if there are no problems. If one or more assertion does fail, it will return an array with messages about each failed assertion. So one way of using it is like this:

```javascript
let error

if (error = assert.fails(url, {
  searchParams: {
    response_type: 'code',
    client_id: 'mockClientId',
    state: assert.optional(/.+/)
  }
})) {
  return metro.response({
    url: req.url,
    status: 400,
    statusText: 'Bad Request',
    body: '400 Bad Request'
  })
}
```

The first parameter to assert.fails contains the data you want to check. The second (or third, fourth, etc.) contain the assertions. If the data is an object, the assertions can use the same property names to add assertions for those specific properties. Here the url.searchParams.response_type must be equal to 'code', or the assertion will fail. You can also use numbers and booleans like this.

You can also add functions to the assertions. In this case the assert.optional() method adds a function that will only fail if the property is set and not null, but does not match the assertions passed to assert.optional().

An assertion may also be a regular expression. If the property value fails to match that expression, the assertion fails. Here the url.searchParams.state is tested to make sure that, if it is set, it must not be empty.

In a mock middleware function, it is all well and good to always test your preconditions. But in production many preconditions may be assumed to be valid. These preconditions are not expected to fail in production, only in development. In that case you may use assert.check(). This function by default does nothing. Only when you enable assertions does this function do anything. This allows you to selectively turn on assertions only in a development context. And avoid doing unnecessary work while in production. This is how it is used in the oauth2 middleware (not the mock server, the actual client code):

```javascript
assert.check(oauth2, {
	client_id: /.+/,
	authRedirectURL: /.+/,
	scope: /.*/
})
```

This makes sure that the client_id and authRedirectURL configuration options have been set and are not empty. But when the code is used in production, this should never happen. There is no need to constantly test for this. And in production it won't actually get checked. Only when you enable assertions will this code actually perform the tests:

```javascript
metro.assert.enable()
```

Once the [`assert.enable()`](./reference/assert/enable.md) function is called, now assert.check will throw an error if any assertion fails. The error is also logged to the console.