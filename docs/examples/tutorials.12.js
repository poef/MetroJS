
const client = metro.client('https://example.com')

async function getPrivateData(data) {
	const response = await client.get('/private')
	if (response.ok) {
		return response.text()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
