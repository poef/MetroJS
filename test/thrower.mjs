import tap from 'tap'
import * as metro from '../src/metro.mjs'
import throwermw from '../src/mw/thrower.mjs'
import errormw from '../src/mw/error.mock.mjs'

tap.test('Status code in root with trailing slash', async t => {
	let c = metro.client().with(errormw()).with(throwermw())
	try {
		let res = await c.get('/404/')
		t.fail()
	} catch(e) {
		t.pass()
	}
	t.end()
})

tap.test('Status code in root without trailing slash', async t => {
	let c = metro.client().with(errormw()).with(throwermw())
	try {
		let res = await c.get('/404')
		t.fail()
	} catch(e) {
		t.pass()
	}
	t.end()
})

tap.test('Status code in nested path with trailing slash', async t => {
	let c = metro.client().with(errormw()).with(throwermw())
	try {
		let res = await c.get('/nested/404/')
		t.fail()
	} catch(e) {
		t.pass()
	}
	t.end()
})

tap.test('Status code in nested path without trailing slash', async t => {
	let c = metro.client().with(errormw()).with(throwermw())
	try {
		let res = await c.get('/nested/404')
		t.fail()
	} catch(e) {
		t.pass()
	}
	t.end()
})
