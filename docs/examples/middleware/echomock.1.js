
import * as metro from '@muze-nl/metro'
import echomw from '@muze-nl/metro/src/mw/echo.mock.mjs'

const client = metro.client().with( echomw() )
