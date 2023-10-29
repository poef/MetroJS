import * as assert from '../src/assert.mjs'
import tap from 'tap'

tap.test('start', t => {
	let source = 'Foo'
	let expect = 'Foo'
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('object', t => {
	let source = {
		foo: 'bar'
	}
	let expect = {
		foo: 'bar'
	}
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('enable', t => {
	let result = assert.check('foo','bar')
	t.equal(result, undefined)
	assert.enable()
	t.throws(() => {
		let result = assert.check('foo','bar')
	})
	t.end()
})

tap.test('function', t => {
	let source = 'Foo'
	let expect = s => !(s=='Foo')
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('regex', t => {
	let source = 'Foo'
	let expect = /F.*/
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('optional', t => {
	let source = {
		foo: 'bar'
	}
	let expect = {
		foo: 'bar',
		bar: assert.optional('foo')
	}
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('optional2', t => {
	let source = {
		foo: 'bar',
		bar: 'baz'
	}
	let expect = {
		foo: 'bar',
		bar: assert.optional('foo')
	}
	let result = assert.fails(source, expect)
	t.ok(result)
	t.equal(result.length, 1)
	t.end()
})

tap.test('oneOf', t => {
	let source = {
		foo: 'bar'
	}
	let expect = {
		foo: assert.oneOf('baz','bar')
	}
	let result = assert.fails(source, expect)
	t.equal(result, false)
	t.end()
})

tap.test('oneOf2', t => {
	let source = {
		foo: 'bar'
	}
	let expect = {
		foo: assert.oneOf('baz','bax')
	}
	let result = assert.fails(source, expect)
	t.ok(result)
	t.equal(result.length, 1)
	t.end()	
})