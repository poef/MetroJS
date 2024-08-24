
const client = metro.client('https://example.com')

async function postData(data) {
	const response = await client.post('/resource', {
		body: data,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		}
	})
	if (response.ok) {
		return response.json()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
