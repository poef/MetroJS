
async function postData(data) {
	const response = await client.post('/resource', metro.formdata(data), {
		headers: {
			Accept: 'application/json'
		}
	})
	if (response.ok) {
		return response.json()
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
