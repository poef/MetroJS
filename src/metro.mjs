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
				return this.#fetch(metro.request(...options))
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

export function request(...options) {
	let r = {}
	for (let option of options) {
		if (typeof option == 'string' || option instanceof String) {
			r = new Request(r, option)
		} else if (option instanceof Request) {
			r = new Request(r)
		} else if (option && typeof option == 'object') {
			for (let param in option) {
				if (!['method','headers','body','mode','credentials',
					'cache','redirect','referrer','referrerPolicy','integrity',
					'keepalive','signal','priority'].includes(param)) {
					throw metroError('metro.request: unknown request parameter '+metroURL+'request/unknown-param-name/', param)
				}
				switch(param) {
					case 'headers':
						r = new Request(r, parseHeadersParam(option.headers, r))
					break
					case 'url':
						r.url = metro.url(r.url, option.url)
					break
					default:
						if (typeof option[param] == 'function') {
							r[param] = option[param](r[param], r)
						} else if (typeof options[param] == 'string' || options[param] instanceof String ) {
							r[param] = ''+options[param]
						} else {
							r[param] = options[param]
						}
					break
				}
			}
		}
	}
	Object.freeze(r)
	return new Proxy(r, {
		get(param) {
			if (param == 'with') {
				return function(...options) {
					return request(r, ...options)
				}
			}
			return r[param]
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
			if (prop == 'with') {
				return function(...options) {
					return url(target, ...options)
				}
			}
			return target[prop]
		}
	})
}

const metroConsole = {
	error: (message, ...details) => {
		console.error('Ⓜ️ '+message)
		if (details) {
			console.log(...details)
		}		
	},
	info: (message, ...details) => {
		console.info('Ⓜ️ '+message)
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
