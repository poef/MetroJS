
import jsonmw from '@muze-nl/metro/src/mw/json.mjs'

const client = metro.client('https://example.com').with( jsonmw() )

async function postData(data) {
	const response = await client.post('/resource', {
		body: data
	})
	if (response.ok) {
		return response.body
	} else {
		throw new NetworkError(response.status+': '+response.statusText)
	}
}
