const express = require('express')
const createApolloServer = require('./apollo')

const createHttpServer = () => {
  const server = createApolloServer()
  const app = express()

  server.applyMiddleware({ app })
  return app
}

module.exports = createHttpServer
