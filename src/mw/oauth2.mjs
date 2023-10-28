import * as metro from '../metro.mjs'
import * as assert from '../assert.mjs'
import jsonmw from './json.mjs'

export default function oauth2mw(options) {

	const oauth2 = {
		tokens: new Map(),
		endpoints: {},
		client: metro.client().with(jsonmw()),
		client_id: '',
		client_secret: '',
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
			default:
				throw new metro.metroError('Unknown oauth2mw option',option)
			break
		}
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
		if (oauth2.grant_type === 'authorization_code' && !ouath2.tokens.has('authorization_code')) {
			let authReqURL = getAuthTokenURL(oauth2.endpoints.authorize)
			if (!oauth2.callbacks.authorize || typeof oauth2.callbacks.authorize !== 'function') {
				throw metro.metroError('oauth2mw: oauth2 with grant_type:authorization_code requires a callback function in client options.oauth2.callbacks.authorize')
			}
			let token = await oauth2.options.callbacks.authorize(authReqURL)
			oauth2.tokens.set('authorization_code', token)
		}
		let tokenReq = getAccessTokenRequest(oauth2.endpoints.token)
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
		let refreshTokenReq = getAccessTokenRequest(oauth2.endpoints.token, 'refresh_token')
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


	function getAuthTokenURL(url) {
		url = metro.url(url, {hash: ''})
		assert.check(oauth2, {
			client_id: /.+/,
			authRedirectURL: /.+/,
			scope: /.*/
		})
		return metro.url(url, {
			search: {
				response_type: 'code',
				client_id:     req.oauth2.client_id,
				redirect_uri:  req.oauth2.authRedirectURL,
				scope:         req.oauth2.scope,
				state:         createState(req)
			}
		})
	}

	function createState(req) {
		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		let randomState = ''
		let counter = 0
	    while (counter < length) {
	        randomState += characters.charAt(Math.floor(Math.random() * charactersLength))
	        counter++
	    }
		req.oauth2.state = randomState;
		return randomState;
	}

	function getAccessTokenRequest(url, grant_type=null) {
		url = metro.url(url, {hash: ''})
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
				if (qauth2.redirect_uri) {
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
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new FormData(params)
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

	return async function(req, next) {
		if (oauth2.force_authorization) {
			return oauth2authorized(req, next)
		}
		let res = await next(req)
		if (res.ok) {
			return res
		}
		switch(res.status) {
			case '400':
			case '401':
				return oauth2authorized(req, next)
			break
		}
		return res
	}

}