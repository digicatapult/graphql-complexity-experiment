// boilerplate apollo-graphql-express

const express = require('express')
const createApolloServer = require('./apollo')

const port = 3000

async function startServer() {
  const server = createApolloServer()
  const app = express()

  server.applyMiddleware({ app })

  app.listen({ port }, err => {
    if (err) {
      console.error('Error starting app:', err)
      throw err
    } else {
      console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
    }
  })
}

startServer()
