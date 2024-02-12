# OAuth2 middleware

The Oauth2 middleware allows you to configure the metro client to handle OAuth2 connections, fetching and refreshing tokens automatically:

```javascript
import oauth2mw from '@muze-nl/metro/src/mw/oauth2.mjs'
const client = metro.client('https://oauth2api.example.com')
.with( oauth2mw({
	client_id: myClientId,
	client_secret: myClientSecret
}) )
````

You pass the OAuth2 configuration options to the `oauth2mw()` function. This returns the middleware function for the metro client.

## Configuration

Valid configuration options are:

- `access_token` - if you've stored an OAuth2 access token, you can set it here
- `authorization_code` - if you've retrieved an OAuth2 authorization code, set it here
- `refresh_token` - sets the refresh token to use when the access token must be refreshed
- `client` - sets the base metro client to use by the OAuth2 middleware
- `client_id` - the OAuth2 client id
- `client_secret` - the OAuth2 client secret
- `grant_type` - currently only `authorization_code` is implemented
- `force_authorization` - if not set or `false`, the OAuth2 middleware will only use OAuth2 if a normal--unauthorized--fetch doesn't work. If set to `true`, all requests will use OAuth2.
- `redirect_uri` - The URL the OAuth2 authorization server will redirect back to
- `state` - How to store the state parameter, defaults to `localStorage`
- `tokens` - How to store tokens. Either a normal object, or a Map-like object.
- `endpoints` - Allows you to set the specific OAuth2 endpoints for `authorization` and getting the access token (`token`)
- `callbacks` - Allows you to set a callback function for the `authorize` step, e.g. by doing a full page redirect or using a new window. The callback function takes one parameter, the authorization URL to use.

## Defaults

Only the `client_id` and `client_secret` don't have valid defaults. The defaults are:

- `grant_type`: `authorization_code`
- `force_authorization`: false
- `redirect_uri`: `document.location`
- `state`:`localStorage`
- `tokens`: `localStorage`
- `client`: `metro.client().with(jsonmw())`
- `callbacks.authorize`: `url => document.location = url`
- `endpoints.authorize`: `/authorize`
- `endpoints.token`: `/token`

