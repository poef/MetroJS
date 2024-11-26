
const user = 'Foo'
const pass = 'Bar'
const client = metro.client('https://example.com', {
	headers: {
		Authorization: 'Basic '+btoa(user+':'+pass)
	}
}
