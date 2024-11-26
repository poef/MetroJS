
const res = metro.response({
	status: 200,
	statusText: 'OK',
	body: {
		data: 'some data'
	}
})

const data = res.body.data
