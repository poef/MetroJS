# assert.oneOf

```
assert.oneOf(...assertions): Function
```

This function is meant to be used as part of an assertion in [`assert.fails()`](./fails.md), e.g:

```javascript
let errors = assert.fails(url.searchParams, {
  grant_type: assert.oneOf('refresh_token','authorization_code')
})
```

Here it will fail if the search parameter `grant_type` is anything other than either `'refresh_token'` or `'authorization_code'`.