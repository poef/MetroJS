
import oauth2mw from '@muze-nl/metro/src/mw/oauth2.mjs'
const client = metro.client('https://oauth2api.example.com')
.with( oauth2mw({
	client_id: myClientId,
	client_secret: myClientSecret
}) )
