
const client = metro.client('https://example.com')
async function getData() {
	const response = await client.get('/resource')

	if (response.ok) {
		return response.text()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
