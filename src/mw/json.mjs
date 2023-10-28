import * as metro from '../metro.mjs'

export async function jsonmw(options) {
	return (req, next) => {
		req = req.with({
			headers: {
				'Content-Type':'application/json',
                'Accept':'application/json'
			}
		})
		if (typeof req.body[metro.symbols.source] == 'object') {
			req = req.with({
				body: JSON.stringify(req.body[metro.symbols.source])
			})
		}
		let res = await next(req)
		let body = await res.json()
		return res.with({
			body
		})
	}
}