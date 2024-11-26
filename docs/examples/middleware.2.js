
async function myMiddleware(req,next) {
  req = req.with('?foo=bar')
  let res = await next(req)
  if (res.ok) {
    res = res.with({headers:{'X-Foo':'bar'}})
  }
  return res
}
