import * as metro from '../src/metro.mjs'
import oauth2mw from '../src/mw/oauth2.mjs'
import oauth2mock from '../src/mw/oauth2.mock.mjs'
import tap from 'tap'

let client = metro.client().with(oauth2mock)

tap.test('start', async t => {
	let res = await client.get('/public/')
	t.ok(res.ok)
	t.end()
})
