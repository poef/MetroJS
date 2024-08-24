
let response = await client.post(url, {
	some: 'data'
})
let result
if (response.ok) {
	result = response.body.something
}
