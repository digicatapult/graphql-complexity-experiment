const createHttpServer = require('./server')

const port = 3000

async function startServer() {
  const server = createHttpServer()

  server.listen({ port }, err => {
    if (err) {
      console.error('Error starting app:', err)
      throw err
    } else {
      console.log(`🚀 Server ready at http://localhost:${port}/graphql`)
    }
  })
}

startServer()
