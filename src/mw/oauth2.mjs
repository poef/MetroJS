import * as metro from '../metro.mjs'
import * as assert from '../assert.mjs'
import jsonmw from './json.mjs'

export default function oauth2mw(options) {

	let localState
	if (typeof localStorage !== 'undefined') {
		localState = {
			get: () => localStorage.getItem('metro/state'),
			has: () => localStorage.getItem('metro/state'),
			set: (value) => localStorage.setItem('metro/state', value)
		}
	} else {
		let stateMap = new Map()
		localState = {
			get: () => stateMap.get('metro/state'),
			has: () => stateMap.get('metro/state'),
			set: (value) => stateMap.set('metro/state', value)
		}
	}

	const oauth2 = {
		tokens: new Map(),
		state: localState,
		endpoints: {},
		callbacks: {},
		client: metro.client().with(jsonmw()),
		client_id: '',
		client_secret: '',
		redirect_uri: '',
		grant_type: 'authorization_code',
		force_authorization: false
	}

	for (let option in options) {
		switch(option) {
			case 'access_token':
			case 'authorization_code':
			case 'refresh_token':
				oauth2.tokens.set(option, options[option])
			break

			case 'client':
			case 'client_id':
			case 'client_secret':
			case 'grant_type':
			case 'force_authorization':
			case 'redirect_uri':
				oauth2[option] = options[option]
			break
			case 'state':
			case 'tokens':
				if (typeof options[option].set == 'function' && 
					typeof options[option].get == 'function' && 
					typeof options[option].has == 'function' ) {
					oauth2[option] = options[option]
				} else if (option == 'tokens' && typeof options.tokens == 'object') {
					for (let token in options.tokens) {
						oauth2.tokens.set(token, options.tokens[token])
					}
				} else {
					throw metro.metroError('metro/mw/oauth2: incorrect value for '+option)
				}
			break
			case 'endpoints':
				for (let endpoint in options.endpoints) {
					if (endpoint!='authorize' && endpoint!='token') {
						throw metro.metroError('Unknown endpoint, choose one of "authorize" or "token"',endpoint)
					}
				}
				Object.assign(oauth2.endpoints, options.endpoints)
			break
			case 'callbacks':
				for (let callback in options.callbacks) {
					if (callback != 'authorize') {
						throw metro.metroError('Unknown callback, choose one of "authorize"',callback)
					}
				}
				Object.assign(oauth2.callbacks, options.callbacks)
			break
			default:
				throw metro.metroError('Unknown oauth2mw option ',option)
			break
		}
		if (!oauth2.redirect_uri) {
			oauth2.redirect_uri = typeof window !== 'undefined' ? window.location?.href : ''
		}
		if (oauth2.redirect_uri) {
			oauth2.redirect_uri = metro.url(oauth2.redirect_uri).with('?metroRedirect=true')
		}
	}

	return async function(req, next) {
		if (oauth2.force_authorization) {
			return oauth2authorized(req, next)
		}
		let res = await next(req)
		if (res.ok) {
			return res
		}
		switch(res.status) {
			case 400:
			case 401:
				return oauth2authorized(req, next)
			break
		}
		return res
	}

	async function oauth2authorized(req, next) {
		getTokensFromLocation()
		if (!oauth2.tokens.has('access_token')) {
			let token = await fetchToken(req)
			if (!token) {
				return metro.response('false')
			}
			return oauth2authorized(req, next)
		} else if (isExpired(req)) {
			let token = await refreshToken(req)
			if (!token) {
				return metro.response('false')
			}
			return oauth2authorized(req, next)
		} else {
			let accessToken = oauth2.tokens.get('access_token')
			req = metro.request(req, {
				headers: {
					Authorization: accessToken.type+' '+accessToken.value
				}
			})
			return next(req)
		}
	}

	function getTokensFromLocation() {
		// check if window.location is available and contains tokens
		if (typeof window !== 'undefined' && window?.location) {
			let url = metro.url(window.location)
			let code, state, params
			if (url.searchParams.has('code')) {
				params = url.searchParams
				url = url.with({ search:'' })
				history.pushState({},'',url.href)
			} else if (url.hash) {
				let query = url.hash.substr(1)
				params = new URLSearchParams('?'+query)
				url = url.with({ hash:'' })
				history.pushState({},'',url.href)
			}
			if (params) {
				code = params.get('code')
				state = params.get('state')
				let storedState = oauth2.state.get('metro/state')
				if (!state || state!==storedState) {
					return
				}
				if (code) {
					oauth2.tokens.set('authorization_code', code)
				}
			}
		}
	}

	async function fetchToken(req) {
		if (oauth2.grant_type === 'authorization_code' && !oauth2.tokens.has('authorization_code')) {
			let authReqURL = getAuthTokenURL()
			if (!oauth2.callbacks.authorize || typeof oauth2.callbacks.authorize !== 'function') {
				throw metro.metroError('oauth2mw: oauth2 with grant_type:authorization_code requires a callback function in client options.oauth2.callbacks.authorize')
			}
			let token = await oauth2.callbacks.authorize(authReqURL)
			if (token) {
				oauth2.tokens.set('authorization_code', token)
			} else {
				return metro.response(false)
			}
		}
		let tokenReq = getAccessTokenRequest()
		let response = await oauth2.client.get(tokenReq)
		if (!response.ok) {
			throw metro.metroError(response.status+':'+response.statusText, await response.text())
		}
		let data = await response.json()
		oauth2.tokens.set('access_token', {
			value: data.access_token,
			expires: getExpires(data.expires_in),
			type: data.token_type,
			scope: data.scope
		})
		if (data.refresh_token) {
			oauth2.tokens.set('refresh_token', data.refresh_token)
		}
		return data
	}

	async function refreshToken(req, next)
	{
		let refreshTokenReq = getAccessTokenRequest('refresh_token')
		let response = await oauth2.client.get(refreshTokenReq)
		if (!response.ok) {
			throw metro.metroError(response.status+':'+response.statusText, await response.text())
		}
		let data = await response.json()
		oauth2.tokens.set('access_token', {
			value:   data.access_token,
			expires: getExpires(data.expires_in),
			type:    data.token_type,
			scope:   data.scope
		})
		if (data.refresh_token) {
			oauth2.tokens.set('refresh_token', data.refresh_token)
		}
		return data
	}


	function getAuthTokenURL() {
		if (!oauth2.endpoints.authorize) {
			throw metro.metroError('oauth2mw: Missing options.endpoints.authorize url')
		}
		let url = metro.url(oauth2.endpoints.authorize, {hash: ''})
		assert.check(oauth2, {
			client_id: /.+/,
			redirect_uri: /.+/,
			scope: /.*/
		})
		let search = {
			response_type: 'code',
			client_id:     oauth2.client_id,
			redirect_uri:  oauth2.redirect_uri,
			state:         createState(40)
		}
		if (oauth2.scope) {
			search.scope = oauth2.scope
		}
		return metro.url(url, { search })
	}

	function createState(length) {
		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		let randomState = ''
		let counter = 0
	    while (counter < length) {
	        randomState += validChars.charAt(Math.floor(Math.random() * validChars.length))
	        counter++
	    }
		oauth2.state.set(randomState)
		return randomState
	}

	function getAccessTokenRequest(grant_type=null) {
		assert.check(oauth2, {
			client_id: /.+/,
			client_secret: /.+/,
			redirect_uri: /.+/
		})
		if (!oauth2.endpoints.token) {
			throw metro.metroError('oauth2mw: Missing options.endpoints.token url')
		}
		let url = metro.url(oauth2.endpoints.token, {hash: ''})
		let params = {
			grant_type:    grant_type || oauth2.grant_type,
			client_id:     oauth2.client_id,
			client_secret: oauth2.client_secret
		}
		if (oauth2.scope) {
			params.scope = oauth2.scope
		}
		switch(oauth2.grant_type) {
			case 'authorization_code':
				params.redirect_uri = oauth2.redirect_uri
				params.code = oauth2.tokens.get('authorization_code')
			break
			case 'client_credentials':
				throw new Error('Not yet implemented') // @TODO:
			break
			case 'refresh_token':
				throw new Error('Not yet implemented') // @TODO:
			break
		}
		return metro.request(url, {
			method: 'GET',
			url: {
				searchParams: params
			}
		})
	}

	function isExpired(req) {
		if (req.oauth2 && req.oauth2.tokens && req.oauth2.tokens.has('access_token')) {
			let now = new Date();
			let token = req.oauth2.tokens.get('access_token')
			return now.getTime() > token.expires.getTime();
		}
		return false;
	}

	function getExpires(duration) {
		if (duration instanceof Date) {
			return new Date(duration.getTime()); // return a copy
		}
		if (typeof duration === 'number') {
			let date = new Date();
			date.setSeconds(date.getSeconds() + duration);
			return date;
		}
		throw new TypeError('Unknown expires type '+duration);
	}


}