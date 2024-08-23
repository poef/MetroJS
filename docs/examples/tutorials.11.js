
const client = metro.client('https://example.com')

async function corsPostData(data) {
	const response = await client.post('/resource', {
		body: metro.formdata(data),
		mode: 'cors',
		credentials: 'same-origin'
	})
	if (response.ok) {
		return response.text()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
