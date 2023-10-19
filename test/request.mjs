import tap from 'tap'
import * as metro from '../src/metro.mjs'

tap.test('start', t => {
	let req = metro.request('https://example.com')
	t.equal(req.url, 'https://example.com/')
	t.end()
})