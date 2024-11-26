
const client = metro.client('https://example.com')

async function postData(data) {
	const response = await client.post('/resource', {
		body: metro.formdata(data)
	})
	if (response.ok) {
		return response.text()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
