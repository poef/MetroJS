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
		body: {
			error: 'invalid_request',
			error_description: error
		}
	}
}

let error, expect, token

export default function oauth2mock(req, next) {
	let url = new URL(req.url)
	switch(url.pathname) {
		case '/authorize/':
			if (error = assert.fails(url.searchParams, {
				response_type: 'code',
				client_id: 'clientId',
				state: /.*/
			})) {
				return metro.response(badRequest(error))
			}
			return metro.response(baseResponse, {
				body: {
					code: 'mockAuthorizeToken',
					state: url.searchParams.get('state')
				}
			})
		break
		case '/token/':
			if (error = assert.fails(url.searchParams, {
				grant_type: assert.oneOf('refresh_token','authorization_code')
			})) {
				return metro.response(badRequest(error))
			}
			if (error = assert.fails(url.searchParams, {
				grant_type: 'refresh_token',
				refresh_token: 'mockRefresh',
				client_id: 'mockClientId',
				client_secret: 'mockClientSecret'
			})) {
				return metro.response(badRequest(error))
			}
			return metro.response(baseResponse, {
				body: {
					access_token: 'mockAccessToken',
					token_type: 'mockExample',
					expires_in: 3600,
					refresh_token: 'mockRefreshToken',
					example_parameter: 'mockExampleValue'
				}
			})
		break
		case '/protected/':
			token = url.searchParams.get('access_token')
			if (!token || token!=='mockAccessToken') {
				return metro.response({
					status: 401,
					statusText: 'Forbidden',
					body: '401 Forbidden'
				})
			}
			return metro.response({
				body: {
					result: 'Success'
				}
			})
		break
		case '/public/':
			token = url.searchParams.get('access_token')
			return metro.response({
				body: {
					result: 'Success',
					token: token
				}
			})
		break
		default:
			console.log('mock oauth2 request url', url.pathname)
			return metro.response({
				status: 404,
				statusText: 'not found',
				body: '404 Not Found'
			})
		break
	}
}