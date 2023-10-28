import * as metro from '../metro.mjs'

export default function jsonmw(options) {
	options = Object.assign({
		reviver: null,
		replacer: null,
		space: ''
	}, options)

	return async (req, next) => {
		if (['POST','PUT','PATCH','QUERY'].includes(req.method)) {
			req = req.with({
				headers: {
					'Content-Type':'application/json',
	                'Accept':'application/json'
				}
			})
			if (req.body && typeof req.body[metro.symbols.source] == 'object') {
				req = req.with({
					body: JSON.stringify(req.body[metro.symbols.source], options.replacer, options.space)
				})
			}
		} else {
			req = req.with({
				headers: {
			        'Accept':'application/json'
				}
			})
		}
		let res = await next(req)
		let body = await res.text()
		let json = JSON.parse(body, options.reviver)
		return res.with({
			body: json
		})
	}
}