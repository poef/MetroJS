# Assert

The assert library allows you to add assertion checks in your code, e.g. middleware components.
Assertion checking can be turned on and off globally, so you can enable it in a development setting, but disable it in production.

If you use the [`assert.check()`](./check.md) method in your middleware, users can turn assertion checking on or off. If you use the [`assert.fails`](./fails.md) method directly, these assertions will always be checked. They can't be turned off.

## Methods
- [`assert.check`](./check.md)
- [`assert.disable`](./disable.md)
- [`assert.enable`](./enable.md)
- [`assert.fails`](./fails.md)
- [`assert.oneOf`](./oneOf.md)
- [`assert.optional`](./optional.md)
