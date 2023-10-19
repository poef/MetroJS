import tap from 'tap'
import * as metro from '../src/metro.mjs'

tap.test('start', t => {
	let req = metro.request('https://example.com')
	t.equal(req.url, 'https://example.com/')
	t.end()
})

tap.test('copy', t => {
	let req = new Request('https://example.com')
	let req2 = metro.request(req, {url:'?foo=bar'})
	t.equal(req.url, 'https://example.com/')
	t.equal(req2.url, 'https://example.com/?foo=bar')
	t.end()
})

tap.test('headers', t => {
	let req = metro.request('https://example.com', {
		headers: {
			'X-Foo': 'bar'
		}
	})
	t.has(req.headers.get('x-foo'), 'bar')
	t.end()
})