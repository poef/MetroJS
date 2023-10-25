const metroURL = 'https://metro.muze.nl/details/'

class Client {
	#options = {
		baseURL: 'https://localhost'
	}
	#verbs = ['get','post','put','delete','patch','head','options','query']

	static tracers = {}

	constructor(...options) {
		this.#options.verbs = this.#verbs
		for (let option of options) {
			if (typeof option == 'string' || option instanceof String) {
				this.#options.baseURL = ''+option
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
				options.push({method: verb.toUpperCase()})
				return this.#fetch(request({url:this.#options.baseURL},...options))
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

	#fetch(request) {
		if (!request.url) {
			throw metroError('metro.client.'+r.method.toLowerCase()+': Missing url parameter '+metroURL+'client/missing-url-param/', request)
		}
		let middlewares = this.#options?.middlewares?.slice() || []
		let options = this.#options
		let middlewareIndex = 0
		let next = async function next(request) {
			let response
			let tracers = Object.values(Client.tracers)
			for(let tracer of tracers) {
				if (tracer.request) {
					tracer.request.call(tracer, request)
				}
			}
			let middleware = middlewares.pop()
			if (!middleware) {
				response = await fetch(request)
			} else {
				response = await middleware(request, next, options)
			}
			for(let tracer of tracers) {
				if (tracer.response) {
					tracer.response.call(tracer, response)
				}
			}
			return response
		}
		return next(request)
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
			if (prop=='source') {
				return body
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
			switch (prop) {
				case 'isProxy':
					return true
				break
				case 'toString':
					return function() {
						return ''+body
					}
				break
			}
		}
	})
}

export function request(...options) {
	let r = new Request('https://localhost/')
	let args, body, method = r.method
	for (let option of options) {
		if (typeof option == 'string' || option instanceof String) {
			let url = new URL(option, r.url)
			r = new Request(url, r)
		} else if (option instanceof Request) {
			r = new Request(option)
		} else if (option && typeof option == 'object') {
			args = {}
			for (let param in option) {
				if (!['method','headers','body','mode','credentials',
					'cache','redirect','referrer','referrerPolicy','integrity',
					'keepalive','signal','priority','url'].includes(param)) {
					throw metroError('metro.request: unknown request parameter '+metroURL+'request/unknown-param-name/', param)
				}
				switch(param) {
					case 'headers':
						appendHeaders(r, option.headers)
					break
					case 'url':
						let u = url(r.url, option.url)
						r = new Request(u, r)
					break
					case 'method':
						// keep track of latest method
						// so you can set a body
						args.method = option.method
						method = args.method
					break
					case 'body':
						if (option.method) {
							method = option.method
						}
						if (typeof option.body == 'function') {
							body = option.body(body || r.body, r)
						} else {
							body = option.body
						}
						let newOptions = {body:body}
						if (method != r.method) {
							newOptions.method = method
						}
						r = new Request(r, newOptions)
					break
					default:
						if (typeof option[param] == 'function') {
							args[param] = option[param](r[param], r)
						} else if (typeof option[param] == 'string' || option[param] instanceof String ) {
							args[param] = ''+option[param]
						} else {
							args[param] = option[param]
						}
					break
				}
			}
			if (args) {
				r = new Request(r, args)
				if (args.body) {
					body = args.body
				}
			}
		}
	}
	Object.freeze(r)
	return new Proxy(r, {
		get(target, prop, receiver) {
			switch(prop) {
				case 'isProxy':
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
				case 'clone':
					return function() {	
						return request(target)
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
						if (body.isProxy) {
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

export function response(...options) {
	let r = {}
	let args = {
		headers: {}
	}
	let body,mock={}
	for (let option of options) {
		if (typeof option == 'string' 
			|| option instanceof String
			|| option instanceof FormData
			|| option instanceof Blob
			|| option instanceof ArrayBuffer
			|| option instanceof DataView
			|| option instanceof ReadableStream
			|| option instanceof URLSearchParams
		) {
			body = option
			r = new Response(option, {
				status: r.status,
				statusText: r.statusText,
				headers: r.headers
			})
		} else if (option instanceof Response) {
			if (typeof option.body == 'function') {
				body = option.body(body || r.body, r)
			} else if (option.body) {
				body = option.body
			}
			if (option.isProxy) {
				for (let param of ['url','type','redirected']) {
					if (typeof option[param] != 'undefined') {
						mock[param] = option[param]
					}
				}
			}
			r = new Response(body, {
				status: option.status,
				statusText: option.statusText,
			})
			Object.assign(args.headers, Object.fromEntries(option.headers.entries()))
		} else if (option && typeof option == 'object') {
			for (let param in option) {
				if (!['status','statusText','headers','body','url','type','redirected'].includes(param)) {
					throw metroError('metro.response: unknown response parameter '+metroURL+'response/unknown-param-name/', param)
				}
				switch(param) {
					case 'headers':
						Object.assign(args.headers, option.headers)
					break
					case 'status':
					case 'statusText':
						args[param] = option[param]
					break
					case 'url':
					case 'type':
					case 'redirected':
						mock[param] = option[param]
					break
					case 'body':
						if (typeof option.body == 'function') {
							body = option.body(body || r.body, r)
						} else {
							body = option.body
						}
						r = new Response(option[param])
					break
				}
			}
		} else {
			throw new Error('Unknown parameter type',option)
		}
	}
	if (args) {
		r = new Response(body, args)
	}
	Object.freeze(r)
	return new Proxy(r, {
		get(target, prop, receiver) {
			if (prop == 'body') {
				if (!body) {
					body = target.body
				}
				if (body) {
					if (body.isProxy) {
						return body
					}
					return bodyProxy(body, target)
				}
			}
			if (prop == 'ok') {
				return (target.status>=200) && (target.status<400)
			}
			if (prop in mock && prop != 'toString') {
				return mock[prop]
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
			switch(prop) {
				case 'isProxy':
					return true
				break
			}
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
				case 'isProxy':
					return true
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

const metroConsole = {
	error: (message, ...details) => {
		console.error('Ⓜ️  '+message)
		if (details) {
			console.log(...details)
		}		
	},
	info: (message, ...details) => {
		console.info('Ⓜ️  '+message)
		if (details) {
			console.log(...details)
		}		
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
