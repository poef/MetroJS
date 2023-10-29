const metroURL = 'https://metro.muze.nl/details/'

export const symbols = {
	isProxy: Symbol('isProxy'),
	source: Symbol('source')
}

class Client {
	#options = {
		url: typeof window != 'undefined' ? window.location : 'https://localhost'
	}
	#verbs = ['get','post','put','delete','patch','head','options','query']

	static tracers = {}

	constructor(...options) {
		this.#options.verbs = this.#verbs
		for (let option of options) {
			if (typeof option == 'string' || option instanceof String) {
				this.#options.url = ''+option
			} else if (option instanceof Client) {
				Object.assign(this.#options, option.#options)
			} else if (option instanceof Function) {
				this.#addMiddlewares([option])
			} else if (option && typeof option == 'object') {
				for (let param in option) {
					if (param == 'middlewares') {
						this.#addMiddlewares(option[param])
					} else if (typeof option[param] == 'function') {
						this.#options[param] = option[param](this.#options[param], this.#options)
					} else {
						this.#options[param] = option[param]
					}
				}
			}
		}
		if (!this.#options.verbs) {
			this.#options.verbs = this.#verbs
		}
		for (const verb of this.#options.verbs) {
			this[verb] = async function(...options) {
				return this.#fetch(request(
					this.#options.url,
					...options,
					{method: verb.toUpperCase()}
				))
			}
		}
		Object.freeze(this)
	}

	#addMiddlewares(middlewares) {
		if (typeof middlewares == 'function') {
			middlewares = [ middlewares ]
		}
		let index = middlewares.findIndex(m => typeof m != 'function')
		if (index>=0) {
			throw metroError('metro.client: middlewares must be a function or an array of functions '
				+metroURL+'client/invalid-middlewares-value/', middlewares[index])
		}
		if (!Array.isArray(this.#options.middlewares)) {
			this.#options.middlewares = []
		}
		this.#options.middlewares = this.#options.middlewares.concat(middlewares)
	}

	#fetch(req) {
		if (!req.url) {
			throw metroError('metro.client.'+r.method.toLowerCase()+': Missing url parameter '+metroURL+'client/missing-url-param/', req)
		}
		let middlewares = this.#options?.middlewares?.slice() || []
		let options = this.#options
		let next = async function next(req) {
			let res
			let tracers = Object.values(Client.tracers)
			for(let tracer of tracers) {
				if (tracer.request) {
					tracer.request.call(tracer, req)
				}
			}
			let middleware = middlewares.pop()
			if (!middleware) {
				if (req[symbols.isProxy]) {
					// even though a Proxy is supposed to be 'invisible'
					// fetch() doesn't work with the proxy (in Firefox), 
					// you need the actual Request object here
					req = req[symbols.source]
				}
				res = response(await fetch(req))
			} else {
				res = await middleware(req, next)
			}
			for(let tracer of tracers) {
				if (tracer.response) {
					tracer.response.call(tracer, res)
				}
			}
			return res
		}
		return next(request(this.#options,req))
	}

	with(...options) {
		return new Client(this, ...options)
	}
}

export function client(...options) {
	return new Client(...options)
}

function appendHeaders(r, headers) {
	if (!Array.isArray(headers)) {
		headers = [headers]
	}
	headers.forEach((header) => {
		if (typeof header == 'function') {
			let result = header(r.headers, r)
			if (result) {
				if (!Array.isArray(result)) {
					result = [result]
				}
				headers = headers.concat(result)
			}
		}
	})
	headers.forEach((header) => {
		Object.entries(header).forEach(([name,value]) => {			
			r.headers.append(name, value)
		})
	})
}

function bodyProxy(body, r) {
	return new Proxy(r.body, {
		get(target, prop, receiver) {
			switch (prop) {
				case symbols.isProxy:
					return true
				break
				case symbols.source:
					return body
				break
				case 'toString':
					return function() {
						return ''+body
					}
				break
			}
			if (typeof body == 'object') {
				if (prop in body) {
					if (typeof body[prop] == 'function') {
						return function(...args) {
							return body[prop].apply(body, args)
						}
					}
					return body[prop]
				}
			}
			if (prop in target && prop != 'toString') {
				// skipped toString, since it has no usable output
				// and body may have its own toString
				if (typeof target[prop] == 'function') {
					return function(...args) {
						return target[prop].apply(target, args)
					}
				}
				return target[prop]
			}
		},
		has(target, prop) {
			return prop in body
		},
		ownKeys(target) {
			return Reflect.ownKeys(body)
		},
		getOwnPropertyDescriptor(target, prop) {
			return Object.getOwnPropertyDescriptor(body,prop)
		}
	})
}

function getRequestParams(req, current) {
	let params = current || {}
	if (!params.url && current.url) {
		params.url = current.url
	}
	// function to fetch all relevant properties of a Request
	for(let prop of ['method','headers','body','mode','credentials','cache','redirect',
		'referrer','referrerPolicy','integrity','keepalive','signal',
		'priority','url']) {
		if (typeof req[prop] == 'function') {
			params[prop] = req[prop](params[prop], params)
		} else if (typeof req[prop] != 'undefined') {
			if (prop == 'url') {
				params.url = new URL(req.url, params.url)
			} else {
				params[prop] = req[prop]
			}
		}
	}
	return params
}

export function request(...options) {
	// the standard Request constructor is a minefield
	// so first gather all the options together into a single
	// javascript object, then set it in one go
	let requestParams = {
		url: typeof window != 'undefined' ? window.location : 'https://localhost/',
		duplex: 'half' // required when setting body to ReadableStream, just set it here by default already
	}
	for (let option of options) {
		if (typeof option == 'string') {
			requestParams.url = new URL(option, requestParams.url)
		} else if (option instanceof Request) {
			Object.assign(requestParams, getRequestParams(option, requestParams))
		} else if (option instanceof URL) {
			requestParams.url = new URL(option, requestParams.url)
		} else if (option && typeof option == 'object') {
			Object.assign(requestParams, getRequestParams(option, requestParams))
		}
	}
	let body = requestParams.body
	if (body) {
		if (typeof body == 'object'
			&& !(body instanceof String)
			&& !(body instanceof ReadableStream)
			&& !(body instanceof Blob)
			&& !(body instanceof ArrayBuffer)
			&& !(body instanceof DataView)
			&& !(body instanceof FormData)
			&& !(body instanceof URLSearchParams)
			&& (typeof TypedArray=='undefined' || !(body instanceof TypedArray))
		) {
			requestParams.body = JSON.stringify(body)
		}
	}
	let r = new Request(requestParams.url, requestParams)
	Object.freeze(r)
	return new Proxy(r, {
		get(target, prop, receiver) {
			switch(prop) {
				case symbols.source:
					return target
				break
				case symbols.isProxy:
					return true
				break
				case 'with':
					return function(...options) {
						return request(target, ...options)
					}
				break
				case 'toString':
				case 'toJSON':
					return function() {
						return target[prop].apply(target)
					}
				break
				case 'blob':
				case 'text':
				case 'json':
					return function() {
						return target[prop].apply(target)
					}
				break
				case 'body':
					// Request.body is always a ReadableStream
					// which is a horrible API, if you want to
					// allow middleware to alter the body
					// so we keep the original body, wrap a Proxy
					// around it to keep the ReadableStream api
					// accessible, but allow access to the original
					// body value as well
					if (!body) {
						body = target.body
					}
					if (body) {
						if (body[symbols.isProxy]) {
							return body
						}
						return bodyProxy(body, target)
					}
				break
			}
			return target[prop]
		}
	})
}

function getResponseParams(res, current) {
	// function to fetch all relevant properties of a Response
	let params = current || {}
	if (!params.url && current.url) {
		params.url = current.url
	}
	for(let prop of ['status','statusText','headers','body','url','type','redirected']) {
		if (typeof res[prop] == 'function') {
			params[prop] = res[prop](params[prop], params)
		} else if (typeof res[prop] != 'undefined') {
			if (prop == 'url') {
				params.url = new URL(res.url, params.url || 'https://localhost/')
			} else {
				params[prop] = res[prop]
			}
		}
	}
	return params
}

export function response(...options) {
	let responseParams = {}
	for (let option of options) {
		if (typeof option == 'string') {
			responseParams.body = option
		} else if (option instanceof Response) {
			Object.assign(responseParams, getResponseParams(option, responseParams))
		} else if (option && typeof option == 'object') {
			if (option instanceof FormData
				|| option instanceof Blob
				|| option instanceof ArrayBuffer
				|| option instanceof DataView
				|| option instanceof ReadableStream
				|| option instanceof URLSearchParams
				|| option instanceof String
				|| (typeof TypedArray != 'undefined' && option instanceof TypedArray)
			) {
				responseParams.body = option
			} else {
				Object.assign(responseParams, getResponseParams(option, responseParams))
			}
		}
	}
	let r = new Response(responseParams.body, responseParams)	
	Object.freeze(r)
	return new Proxy(r, {
		get(target, prop, receiver) {
			switch(prop) {
				case symbols.isProxy:
					return true
				break
				case symbols.source:
					return target
				break
				case 'with':
					return function(...options) {
						return response(target, ...options)
					}
				break
				case 'body':
					if (responseParams.body) {
						if (responseParams.body[symbols.isProxy]) {
							return responseParams.body
						}
						return bodyProxy(responseParams.body, target)
					} else {
						return bodyProxy('',target)
					}
				break
				case 'ok':
					return (target.status>=200) && (target.status<400)
				break
				case 'headers':
					return target.headers
				break
				default:
					if (prop in responseParams && prop != 'toString') {
						return responseParams[prop]
					}
					if (prop in target && prop != 'toString') {
						// skipped toString, since it has no usable output
						// and body may have its own toString
						if (typeof target[prop] == 'function') {
							return function(...args) {
								return target[prop].apply(target, args)
							}
						}
						return target[prop]
					}
				break
			}
			return undefined
		}
	})
}

function appendSearchParams(url, params) {
	if (typeof params == 'function') {
		 let result = params(url.searchParams, url)
		 if (result) {
		 	url.searchParams = result
		 }
	} else {
		params = new URLSearchParams(params)
		params.forEach((value,key) => {
			url.searchParams.append(key, value)
		})
	}
}

export function url(...options) {
	let u = 'https://localhost/'
	for (let option of options) {
		if (typeof option == 'string' || option instanceof String) {
			// option is a relative or absolute url
			u = new URL(option, u)
		} else if (option instanceof URL) {
			u = new URL(option)
		} else if (option && typeof option == 'object') {
			for (let param in option) {
				if (param=='search') {
					if (typeof option.search == 'function') {
						u.search = option.search(u.search, u)
					} else {
						u.search = new URLSearchParams(option.search)
					}
				} else if (param=='searchParams') {
					appendSearchParams(u, option.searchParams)
				} else {
					if (!['hash','host','hostname','href','origin',
						'password','pathname','port','protocol','username'].includes(param)) {
						throw metroError('metro.url: unknown url parameter '+metroURL+'url/unknown-param-name/', param)
					}
					if (typeof option[param] == 'function') {
						u[param] = option[param](u[param], u)
					} else if (
						typeof option[param] == 'string' || option[param] instanceof String 
						|| typeof option[param] == 'number' || option[param] instanceof Number
						|| typeof option[param] == 'boolean' || option[param] instanceof Boolean
					) {
						u[param] = ''+option[param]
					} else if (typeof option[param] == 'object' && option[param].toString) {
						u[param] = option[param].toString()
					} else {
						throw metroError('metro.url: unsupported value for '+param+' '+metroURL+'url/unsupported-param-value/', options[param])
					}
				}
			}
		} else {
			throw metroError('metro.url: unsupported option value '+metroURL+'url/unsupported-option-value/', option)
		}
	}
	Object.freeze(u)
	return new Proxy(u, {
		get(target, prop, receiver) {
			switch(prop) {
				case symbols.isProxy:
					return true
				break
				case symbols.source:
					return target
				break
				case 'with':
					return function(...options) {
						return url(target, ...options)
					}
				break
				case 'toString':
				case 'toJSON':
					return function() {
						return target[prop]()
					}
				break
			}
			return target[prop]
		}
	})
}

export function formdata(...options) {
	var params = new FormData()
	for (let option of options) {
		if (option instanceof FormData) {
			for (let entry of option.entries()) {
				params.append(entry[0],entry[1])
			}
		} else if (option && typeof option == 'object') {
			for (let entry of Object.entries(option)) {
				if (Array.isArray(entry[1])) {
					for (let value of entry[1]) {
						params.append(entry[0], value)
					}
				} else {
					params.append(entry[0],entry[1])
				}
			}
		} else {
			throw new metroError('metro.formdata: unknown option type, only FormData or Object supported',option)
		}
	}
	Object.freeze(params)
	return new Proxy(params, {
		get: (target,prop,receiver) => {
			switch(prop) {
				case symbols.isProxy:
					return true
				break
				case symbols.source:
					return target
				break
				case 'with':
					return function(...options) {
						return formdata(target, ...options)
					}
				break
				case 'toString':
				case 'toJSON':
					return function() {
						return target[prop]()
					}
				break
			}
			return target[prop]
		}
	})
}

const metroConsole = {
	error: (message, ...details) => {
		console.error('Ⓜ️  '+message, ...details)
	},
	info: (message, ...details) => {
		console.info('Ⓜ️  '+message, ...details)
	},
	group: (name) => {
		console.group('Ⓜ️  '+name)
	},
	groupEnd: (name) => {
		console.groupEnd('Ⓜ️  '+name)
	}
}

export function metroError(message, ...details) {
	metroConsole.error(message, ...details)
	return new Error(message, ...details)
}


export const trace = {
	add(name, tracer) {
		Client.tracers[name] = tracer
	},
	delete(name) {
		delete Client.tracers[name]
	},
	clear() {
		Client.tracers = {}
	},
	group() {
		let group = 0;
		return {
			request: (req) => {
				group++
				metroConsole.group(group)
				metroConsole.info(req.url)				
			},
			response: (res) => {
				metroConsole.info(res.body)
				metroConsole.groupEnd(group)
				group--
			}
		}
	}
}
