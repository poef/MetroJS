
import * as metro from '@muze-nl/metro'
import throwermw from '@muze-nl/metro/src/mw/thrower.mjs'

const client = metro.client().with( throwermw() )

try {
	let response = await client.get('https://example.com/404/')
	result = response.text()
} catch(err) {
	console.error(err)
}
