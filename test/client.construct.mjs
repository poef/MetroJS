import tap from 'tap'
import * as metro from '../src/metro.mjs'

tap.test('Client URL should be localhost when instantiated without parameters', t => {
  const client = metro.client()
  t.equal(client.url.toString(), 'https://localhost/')
  t.end()
})

tap.test('Client URL should be given URL when instantiated with URL string', t => {
  const client = metro.client('https://example.com')
  t.equal(client.url.toString(), 'https://example.com/')
  t.end()
})

tap.test('Client URL should be given URL when instantiated with URL object', t => {
  let url = new URL('https://example.com')
  const client = metro.client(url)
  t.equal(client.url.toString(), url.toString())
  t.end()
})

tap.test('Client URL should be overwritten when instantiated with URL string and URL option', t => {
  const client = metro.client('https://example.com', {url: 'https://muze.nl'})
  t.equal(client.url.toString(), 'https://muze.nl/')
  t.end()
})

tap.test('Client URL should contain query string when instantiated with URL string containing query string', t => {
  const client = metro.client('https://example.com?foo=bar')
  t.equal(client.url.toString(), 'https://example.com/?foo=bar')
  t.end()
})

tap.test('Client URL should contain query string when instantiated with URL string and query parameter option', t => {
  const client = metro.client('https://example.com', {search: {"foo": 'bar'}})
  t.equal(client.options, 'https://example.com/?foo=bar')
  t.equal(client.url.toString(), 'https://example.com/?foo=bar')
  t.end()
})

tap.test('Client URL should contain overwritten query string when instantiated with URL string and query parameter option', t => {
  const client = metro.client('https://example.com?foo=bar', {search: {"foo": 'baz'}})
  t.equal(client.url.toString(), 'https://example.com/?foo=baz')
  t.end()
})

