const express = require('express')
const Cache = require('lru-cache')
const compression = require('compression')
const Wall = require('./')

const app = express()
const api = new Wall()
const cache = new Cache({
  max: 5000,
  maxAge: 1000 * 60 * 60 * 24 // 1 day
})

app.use(compression())
app.use(function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  next();
});

app.get('/', (req, res) => {
  res.end(`
GET /search?keyword="keyword"
GET /details/:id
`)
})

function cacheMiddleWare(req, res, next) {
  if (req.query.sorting === 'random') {
    return next()
  }
  let cached
  if (cached = cache.get(req.url)) {
    res.send(cached)
  } else {
    next()
  }
}

function handleError(fn) {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      if (err.response) {
        res.status(err.response.status)
        res.send({
          error: true,
          status: err.response.status,
          message: err.response.statusText || err.message
        })
      } else {
        res.status(500)
        res.send({
          error: true,
          message: err.message
        })
      }
    }
  }
}

app.get('/search', cacheMiddleWare, handleError(async (req, res) => {
  const fetched = await api.search(req.query.keyword, req.query)
  cache.set(req.url, fetched)
  res.send(fetched)
}))

app.get('/details/:id', cacheMiddleWare, handleError(async (req, res) => {
  const fetched = await api.details(req.params.id)
  cache.set(req.url, fetched)
  res.send(fetched)
}))

app.listen(process.env.PORT || 3000)

console.log('> Open http://localhost:'+process.env.PORT || 3000)
