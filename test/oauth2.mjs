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

tap.test('oauth2start', async t => {
	const oauth2client = client.with(oauth2mw({
		access_token: {
			type: 'Bearer',
			value: 'mockAccessToken'
		},
		force_authorization: true
	}))

	let res = await oauth2client.get('/protected/')
	t.ok(res.ok)
	let json = await res.json()
	t.equal(json.result,'Success')
	t.end()
})