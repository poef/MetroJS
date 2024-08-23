
metro.trace.add('debug', {
  request: (req) => {
    if (req.searchParams.has('foo')) {
      debugger;

    }

  }
})
