import tap from 'tap'
import * as metro from '../src/metro.mjs'

tap.test('start', async t => {
	let c = metro.client(
		{
			baseURL: 'https://muze.nl',
			middlewares: (req,next) => new Response('This is the body')
		}
	)
	let res = await c.get('foo/')
	let content = await res.text()
	t.equal(content, 'This is the body')
	t.end()
})

tap.test('withFunction', async t => {
	let c = metro.client()
	c = c.with((req,next) => metro.response('This is the body'))
	let res = await c.get('foo/')
	t.equal(''+res.body, 'This is the body')
	t.end()
})

tap.test('tracers', async t => {
	let c = metro.client()
	let trace = []
	metro.trace.add('test', {
		request: r => trace.push({request: r}),
		response: r => trace[trace.length-1].response = r
	})
	c = c.with((req,next) => metro.response('This is the body'))
	let res = await c.get('foo/')
	t.equal(trace.length, 1)
	t.equal(trace[0].request.url, 'https://localhost/foo/')
	t.equal(''+trace[0].response.body, 'This is the body')
	t.equal(''+res.body, 'This is the body')
	t.end()
})