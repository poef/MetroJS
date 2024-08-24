
let error

if (error = assert.fails(url, {
  searchParams: {
    response_type: 'code',
    client_id: 'mockClientId',
    state: assert.optional(/.+/)
  }
})) {
  return metro.response({
    url: req.url,
    status: 400,
    statusText: 'Bad Request',
    body: '400 Bad Request'
  })
}
