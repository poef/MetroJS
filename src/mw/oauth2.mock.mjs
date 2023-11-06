import * as metro from '../metro.mjs'
import * as assert from '../assert.mjs'

const baseResponse = {
	status: 200,
	statusText: 'OK',
	headers: {
		'Content-Type':'application/json'
	}
}

const badRequest = (error) => {
	return {
		status: 400,
		statusText: 'Bad Request',
		headers: {
			'Content-Type':'application/json'
		},
		body: JSON.stringify({
			error: 'invalid_request',
			error_description: error
		})
	}
}

let error, expect, token

export default function oauth2mock(req, next) {
	let url = metro.url(req.url)
	switch(url.pathname) {
		case '/authorize/':
			if (error = assert.fails(url.searchParams, {
				response_type: 'code',
				client_id: 'clientId',
				state: assert.optional(/.*/)
			})) {
				return metro.response(badRequest(error))
			}
			return metro.response(baseResponse, {
				body: JSON.stringify({
					code: 'mockAuthorizeToken',
					state: url.searchParams.get('state')
				})
			})
		break
		case '/token/':
			if (error = assert.fails(url.searchParams, {
				grant_type: assert.oneOf('refresh_token','authorization_code')
			})) {
				return metro.response(badRequest(error))
			}
			switch(url.searchParams.grant_type) {
				case 'refresh_token':
					if (error = assert.fails(url.searchParams, {
						refresh_token: 'mockRefresh',
						client_id: 'mockClientId',
						client_secret: 'mockClientSecret'
					})) {
						return metro.response(badRequest(error))
					}
				break
				case 'access_token':
					if (error = assert.fails(url.searchParams, {
						client_id: 'mockClientId',
						client_secret: 'mockClientSecret'
					})) {
						return metro.response(badRequest(error))
					}
				break
			}

			return metro.response(baseResponse, {
				body: JSON.stringify({
					access_token: 'mockAccessToken',
					token_type: 'mockExample',
					expires_in: 3600,
					refresh_token: 'mockRefreshToken',
					example_parameter: 'mockExampleValue'
				})
			})
		break
		case '/protected/':
			let auth = req.headers.get('Authorization')
			let [type,token] = auth ? auth.split(' ') : []
			if (!token || token!=='mockAccessToken') {
				return metro.response({
					status: 401,
					statusText: 'Forbidden',
					body: '401 Forbidden'
				})
			}
			return metro.response(baseResponse, {
				body: JSON.stringify({
					result: 'Success'
				})
			})
		break
		case '/public/':
			return metro.response(baseResponse, {
				body: JSON.stringify({
					result: 'Success'
				})
			})
		break
		default:
			return metro.response({
				status: 404,
				statusText: 'not found',
				body: '404 Not Found '+url
			})
		break
	}
}