const metroURL = 'https://metro.muze.nl/details/'

class Client {
	#options = {}
	construct(...options) {
		this.#options.verbs = ['get','post','put','delete','patch','head','options','query']
		for (let option of options) {
			if (typeof option == 'string' || option instanceof String) {
				this.#options.baseURL = ''+option
			} else if (option instanceof Client) {
				this.#options = option.#options
			} else if (option instanceof Function) {
				this.#options = option(this.#options)
			} else if (option && typeof option == 'object') {
				for (let param in option) {
					if (typeof option[param] == 'function') {
						this.#options[param] = option[param](this.#options[param], this.#options)
					} else if (param == 'middlewares') {
						if (typeof option.middlewares == 'function') {
							option.middlewares = [ option.middlewares ]
						}
						let index = option.middlewares.findIndex(m => typeof m != 'function')
						if (index>=0) {
							throw metroError('metro.client: middlewares must be a function or an array of functions '
								+metroURL+'client/invalid-middlewares-value/', option.middlewares[index])
						}
						this.#options.middlewares = this.#options.middlewares.concat(option.middlewares)
					} else {
						this.#options[param] = option[param]
					}
				}
			}
		}
		for (let verb of this.#options.verbs) {
			this[verb] = async function(...options) {
				options.push({method: verb.toUpper()})
				return this.#fetch(request(...options))
			}
		}
		Object.freeze(this)
	}

	#fetch(req) {
		if (!req.url) {
			throw metroError('metro.client.'+r.method.toLower()+': Missing url parameter '+metroURL+'client/missing-url-param/', req)
		}
		let middlewareIndex = count(this.#options?.middleware) || -1
		let next = async function next(req) {
			let result, group = 'get '+middlewareIndex
			if (this.#options.trace) {
				metroConsole.group(group)
				metroConsole.info(req)				
			}
			if (middlewareIndex<0) {
				result = await fetch(req)
			} else {
				let middleware = this.#options.middlewares[middlewareIndex]
				middlewareIndex--
				result = await middleware(req, next)
			}
			if (this.#options.trace) {
				metroConsole.info(result)
				metroConsole.groupEnd(group)
			}
			return result
		}
		return next(req)
	}

	with(...options) {
		return new Client(...this.#options, ...options)
	}
}

export function client(...options) {
	return new Client(...options)
}

function appendHeaders(req, headers) {
	if (!Array.isArray(headers)) {
		headers = [headers]
	}
	headers.forEach((header) => {
		if (typeof header == 'function') {
			let result = header(req.headers, req)
			if (result) {
				req.headers = result
			}
		} else {
			Object.entries(header).forEach(([name,value]) => {
				req.headers.append(name, value)
			})
		}
	})
}

export function request(...options) {
	let r = new Request('https://localhost/')
	let args, body
	for (let option of options) {
		if (typeof option == 'string' || option instanceof String) {
			r = new Request(option, r)
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
					default:
						if (typeof option[param] == 'function') {
							let paramValue
							if (param=='body') {
								if (body) {
									paramValue = body
								} else {
									paramValue = r.body
								}
							} else {
								paramValue = r[param]
							}
							args[param] = option[param](paramValue, r)
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
						body = r.body
					}
					if (body) {
						if (body.isProxy) {
							return body
						}
						if (typeof body !== 'object') {
							// Proxy forces us to make objects of string/number/boolean
							// literals
							switch(typeof body) {
								case 'string':
									body = new String(body)
								break
								case 'number':
									body = new Number(body)
								break
								case 'boolean':
									body = new Boolean(body)
								break
							}
						}
						return new Proxy(body, {
							get(bodyTarget, prop, receiver) {
								switch (prop) {
									case 'isProxy':
										return true
									break
									case 'getReader':
									case 'cancel':
									case 'pipeThrough':
									case 'pipTo':
									case 'tee':
										return function(...args) {
											return target.body[prop].apply(target.body, args)
										}
									break
									case 'valueOf':
										return function() {
											return body.valueOf.apply(body)
										}
									break
								}
								return body[prop]
							}
						})
					}
				break
			}
			return target[prop]
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
		console.group(name)
	},
	groupEnd: (name) => {
		console.groupEnd(name)
	}
}

function metroError(message, ...details) {
	metroConsole.error(message, ...details)
	return new Error(message, ...details)
}