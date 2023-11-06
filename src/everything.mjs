import * as metro from './metro.mjs'
import * as assert from './assert.mjs'
import jsonmw from './mw/json.mjs'
import oauth2 from './mw/oauth2.mjs'

window.metro = metro
window.assert = assert
window.metro.mw = {
	jsonmw,
	oauth2
}