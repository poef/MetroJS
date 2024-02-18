# Thrower middleware

The `throwermw()` middleware will throw Errors when a response returns with a status in the 400 to 599 tange.

## Usage

```javascript
import * as metro from '@muze-nl/metro'
import throwermw from '@muze-nl/metro/src/mw/thrower.mjs'

const client = metro.client().with( throwermw() )

try {
	let response = await client.get('https://example.com/404/')
	result = response.text()
} catch(err) {
	console.error(err)
}
```

## Configuration Options

You can set custom handling for specific status codes, like this:

```javascript
const client = metro.client().with( throwermw({
	404: (req) => {
		return client.get(req.with({
			url: 'https://example.com/'
		}))
	}
}))
```

