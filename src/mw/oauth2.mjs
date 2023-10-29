import * as metro from '../metro.mjs'
import * as assert from '../assert.mjs'
import jsonmw from './json.mjs'

export default function oauth2mw(options) {

	const oauth2 = {
		tokens: new Map(),
		endpoints: {},
		callbacks: {},
		client: metro.client().with(jsonmw()),
		client_id: '',
		client_secret: '',
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
				oauth2[option] = options[option]
			break
			case 'tokens':
				if (typeof options.tokens.set == 'function' && 
					typeof options.tokens.get == 'function' && 
					typeof options.tokens.has == 'function' ) {
					oauth2.tokens = option.tokens
				} else if (options.tokens && typeof options.tokens == 'object') {
					for (let token in options.tokens) {
						oauth2.tokens.set(token, options.tokens[token])
					}
				}
			break
			case 'endpoints':
				for (let endpoint in options.endpoints) {
					if (endpoint!='authorize' && endpoint!='token') {
						throw new metro.metroError('Unknown endpoint, choose one of "authorize" or "token"',endpoint)
					}
				}
				Object.assign(oauth2.endpoints, options.endpoints)
			break
			case 'callbacks':
				for (let callback in options.callbacks) {
					if (callback != 'authorize') {
						throw new metro.metroError('Unknown callback, choose one of "authorize"',callback)
					}
				}
				Object.assign(oauth2.callbacks, options.callbacks)
			break
			default:
				throw new metro.metroError('Unknown oauth2mw option ',option)
			break
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
		if (!oauth2.tokens.has('access_token')) {
			await fetchToken(req)
			return oauth2authorized(req, next)
		} else if (isExpired(req)) {
			await refreshToken(req)
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

	async function fetchToken(req) {
		if (oauth2.grant_type === 'authorization_code' && !oauth2.tokens.has('authorization_code')) {
			let authReqURL = getAuthTokenURL()
			if (!oauth2.callbacks.authorize || typeof oauth2.callbacks.authorize !== 'function') {
				throw metro.metroError('oauth2mw: oauth2 with grant_type:authorization_code requires a callback function in client options.oauth2.callbacks.authorize')
			}
			let token = await oauth2.callbacks.authorize(authReqURL)
			oauth2.tokens.set('authorization_code', token)
		}
		let tokenReq = getAccessTokenRequest()
		let response = await oauth2.client.post(tokenReq)
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
			oauth2.tokens.set('refresh', data.refresh_token)
		}
		return data
	}

	async function refreshToken(req, next)
	{
		let refreshTokenReq = getAccessTokenRequest('refresh_token')
		let response = await oauth2.client.post(refreshTokenReq)
		if (!response.ok) {
			throw metro.metroError(res.status+':'+res.statusText, await res.text())
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
			authRedirectURL: /.+/,
			scope: /.*/
		})
		return metro.url(url, {
			search: {
				response_type: 'code',
				client_id:     oauth2.client_id,
				redirect_uri:  oauth2.authRedirectURL,
				scope:         oauth2.scope,
				state:         createState(40)
			}
		})
	}

	function createState(length) {
		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		let randomState = ''
		let counter = 0
	    while (counter < length) {
	        randomState += validChars.charAt(Math.floor(Math.random() * validChars.length))
	        counter++
	    }
		oauth2.state = randomState;
		return randomState;
	}

	function getAccessTokenRequest(grant_type=null) {
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
				if (oauth2.redirect_uri) {
					params.redirect_uri = oauth2.redirect_uri
				}
				params.code = oauth2.tokens.get('authorization')
				params.response_type = 'token' // spec #3.1.1
			break
			case 'client_credentials':
				throw new Error('Not yet implemented') // @TODO:
			break
			case 'refresh_token':
				throw new Error('Not yet implemented') // @TODO:
			break
		}
		return metro.request(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: metro.formdata(params)
		})
	}

	function isExpired(req) {
		if (req.oauth2 && req.oauth2.tokens && req.oauth2.tokens.access) {
			let now = new Date();
			return now.getTime() > req.oauth2.tokens.access.expires.getTime();
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