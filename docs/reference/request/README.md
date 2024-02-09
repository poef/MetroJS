# metro.request

```
metro.request(...options) : Request
```

Returns a new request, built out of the options passed. Later option values override earlier values. 

You can add any valid property of [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) to an option. 

If you enter a string as option, it will always be interpreted as a URL. Just like a [metro.url](../url/README.md) or [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) or [Location](https://developer.mozilla.org/en-US/docs/Web/API/Location) object. e.g.:

```javascript
let req = metro.request('https://example.com/')
```

## default request methods

- [`arrayBuffer()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/arrayBuffer)
- [`blob()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/blob)
- [`clone()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/clone)
- [`formData()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/formData)
- [`json()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/json)
- [`text()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/text)

## metro request methods

- [`with()`](./with.md)