# Introduction

## About MetroJS

MetroJS is an HTTPS client with support for middleware. Similar to ExpressJS, but for the client:

```javascript
import * as metro from '@muze-nl/metro'
import jsonmw from '@muze-nl/metro/src/mw/json.mjs'

const token = 'my-token'

const client = metro.client({
  url: 'https://api.github.com/',
  headers: {
    'Authorization':'Bearer '+token
  }
}).with(jsonmw())

let response = await client.get('/repos/poef/metrojs/commits')

if (response.ok) {
  for ( const commit of response.body ) {
    console.log(commit.commit.message)
  }
}
```

MetroJS is designed to be fully compatible with the Fetch API, including Request, Response, URL and FormData.

The metro versions of Request, Response, etc. are all a Proxy to the real Request, Response, etc. The proxies add abilities that a normal Request or Response do not have. Like a with() function to create a derived version. Or in the case of Response, the ability to set values that aren't accessible in the normal Response constructor.

This allows metro to implement full middleware capabilities, including creating mocks, without giving up compatibility with normal Request and Response code.
