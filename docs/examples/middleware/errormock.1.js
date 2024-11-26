
import * as metro from '@muze-nl/metro'
import errormw from '@muze-nl/metro/src/mw/error.mock.mjs'

const client = metro.client().with( errormw() )
try {
	client.get('https://example.com/404/')
} catch(err) {
	console.error(err)
}
