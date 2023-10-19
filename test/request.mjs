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

tap.test('body', t => {
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: 'This is the body'
	})
	t.equal(''+req.body, 'This is the body')
	t.end()
})

tap.test('bodyFormData', t => {
	let fd = new FormData()
	fd.append('foo','bar')
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: fd
	})
	t.ok(req.body instanceof ReadableStream)
	t.equal(req.body.get('foo'), 'bar')
	t.end()
})

tap.test('bodyReadableStream', async t => {
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: 'This is the body'
	})
	let reader = req.body.getReader()
	let result = await reader.read().then(({done, value}) => value)
	t.ok(result instanceof Uint8Array)
	t.end()
})

tap.test('bodyFunction', t => {
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: 'This is the body'
	}, {
		body: (b, r) => {
			return b+' altered'
		}
	})
	t.equal(''+req.body, 'This is the body altered')
	t.end()
})

tap.test('clone', t => {
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: 'This is the body'
	})
	let req2 = req.clone()
	t.notEqual(req, req2)
	t.equal(req.url, req2.url)
	t.end()
})

tap.test('text', async t => {
	let req = metro.request('https://example.com', {
		method: 'POST',
		body: 'This is the body'
	})
	let s = await req.text()
	t.equal(s, 'This is the body')
	t.end()
})

