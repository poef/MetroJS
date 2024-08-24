
const token = 'Foo'
const client = metro.client('https://example.com', {
	headers: {
		Authorization: 'Bearer '+token
	}
}
