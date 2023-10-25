import * as metro from '../metro.mjs'
import * as assert from '../assert.mjs'

export default async function oauth2mw(oauth2) {

	const defaults = {
		token: {},
		endpoints: {},
		client: metro.client()
	}
	oauth2 = Object.assign({}, defaults, oauth2 || {})

	async function oauth2authorized(req, next) {
		oauth2.tokens = oauth2.tokenStore.get(req)
		if (!oauth2.tokens.access) {
			let res = await fetchToken(req, oauth2)
			oauth2.tokenStore.set(req, oauth2.tokens)
			return oauth2authorized(req, next, oauth2)
		} else if (isExpired(req)) {
			let res = await refreshToken(req, oauth2)
			oauth2.tokenStore.set(req, oauth2.tokens)
			return oauth2authorized(req, next, oauth2)
		} else {
			req = metro.request(req, {
				headers: {
					Authorization: oauth2.tokens.access.type+' '+oauth2.tokens.access.value
				}
			})
			return next(req)
		}
	}

	async function fetchToken(req) {
		if (oauth2.grant_type === 'authorization_code' && !ouath2.tokens.authorization) {
			let authReqURL = getAuthTokenURL(oauth2.endpoints.authorize)
			if (!oauth2.callbacks.authorize || typeof oauth2.callbacks.authorize !== 'function') {
				throw metro.metroError('oauth2mw: oauth2 with grant_type:authorization_code requires a callback function in client options.oauth2.callbacks.authorize')
			}
			let token = await oauth2.options.callbacks.authorize(authReqURL)
			oauth2.tokens.authorization = token
		}
		let tokenReq = metro.request({
			url: getAccessTokenURL(oauth2.endpoints.token),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		})
		let res = await oauth2.client.get(req)
		if (!res.ok) {
			throw metro.metroError(res.status+':'+res.statusText, await res.text())
		}
		let data = await res.json()
		oauth2.tokens.access = {
			value: data.access_token,
			expires: getExpires(data.expires_in),
			type: data.token_type,
			scope: data.scope
		}
		if (data.refresh_token) {
			oauth2.tokens.refresh = data.refresh_token
		}
		return data
	}

	function getAuthTokenURL(url) {
		url = metro.url(url, {hash: ''})
		assert.check(oauth2, {
			client: {
				id: /.*/
			},
			authRedirectURL: /.*/,
			scope: /.*/
		})
		return metro.url(url, {
			search: {
				response_type: 'code',
				client_id:     req.oauth2.client.id,
				redirect_uri:  req.oauth2.authRedirectURL,
				scope:         req.oauth2.scope,
				state:         createState(req)
			}
		})
	}

	function createState(req) {
		const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let array = new Uint8Array(40);
		window.crypto.getRandomValues(array);
		array = array.map(x => validChars.charCodeAt(x % validChars.length));
		const randomState = String.fromCharCode.apply(null, array);
		req.oauth2.state = randomState;
		return randomState;
	}

	function getAccessTokenURL(url) {
		url = metro.url(url, {hash: ''})
		let params = {
			grant_type:    oauth2.grant_type,
			client_id:     oauth2.client.id,
			client_secret: oauth2.client.secret
		}
		if (oauth2.scope) {
			params.scope = oauth2.scope
		}
		switch(oauth2.grant_type) {
			case 'authorization_code':
				if (qauth2.redirect_uri) {
					params.redirect_uri = oauth2.redirect_uri
				}
				params.code = oauth2.tokens.authorization
				params.response_type = 'token' // spec #3.1.1
			break
			case 'client_credentials':
				throw new Error('Not yet implemented') // @TODO:
			break
			case 'refresh_token':
				throw new Error('Not yet implemented') // @TODO:
			break
		}
		return metro.url(url, {
			search: params
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
		if (options && options.forceAuthorization) {
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