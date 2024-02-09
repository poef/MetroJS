# assert.check

```
assert.check(data, ...assertions) : throws
```

This will call [`assert.fails()`](./fails.md). If any assertion fails, it will throw an error with all failed assertions. If assert is disabled--the default state--no assertions will be checked. See [`assert.fails`](./fails.md) for a list of possible assertions.