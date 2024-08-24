
function myValidatorFunction(property, data) {
  if (data.error) {
    return data.error
  }
  return false // no problems
}

let errors = assert.fails(response, {
  status: 200,
  headers: {
    'Content-Type':'application/json',
    'Etag': assert.optional(/([a-z0-9_\-])+/i)
  },
  body: myValidatorFunction
})
