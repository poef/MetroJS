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