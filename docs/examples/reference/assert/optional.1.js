
let errors = assert.fails(url.searchParams, {
    state: assert.optional(/.+/)
})
