
import * as metro from '@muze-nl/metro'
import jsonmw from '@muze-nl/metro/src/mw/json.mjs'

const token = 'my-token'

const client = metro.client({
  url: 'https://api.github.com/',
  headers: {
    'Authorization':'Bearer '+token
  }
}).with(jsonmw())

let response = await client.get('/repos/poef/metrojs/commits')

if (response.ok) {
  for ( const commit of response.body ) {
    console.log(commit.commit.message)
  }
}
