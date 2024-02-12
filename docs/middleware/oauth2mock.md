# OAuth2 Mock Middleware

The `oauth2mock` middleware implements a mock of an OAuth2 server. It doesn't actually call `fetch()` or `next()`, so no network requests are made. Instead it parses the request and implements a very basic OAuth2 authorization_code flow.

The `oauth2mock` server handles requests with the following pathnames--regardless of the domain used.

- `/authorize/` - returns an authorization_code
- `/token/` - returns an access_token
- `/protected/` - requires an access_token, or returns 401 Forbidden
- `/public/` - doesn't require an access_token

Any other requests will return a 404 Not Found response.

The OAuth2 mock server expects/provides the following values for the OAuth2 settings:

- `client_id`: `mockClientId`
- `client_secret`: `mockClientSecret`
- `authorization_code`: `mockAuthorizeToken`
- `refresh_token`: `mockRefreshToken`
- `access_token`: `mockAccessToken`

