
import * as metro from '@muze-nl/metro'
import jsonmw from '@muze-nl/metro/src/mw/json.mjs'

const client = metro.client().with( jsonmw({
	space: "\t"
}) )
