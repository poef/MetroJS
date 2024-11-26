
const client = metro.client().with( throwermw({
	404: (req) => {
		return client.get(req.with({
			url: 'https://example.com/'
		}))
	}
}))
