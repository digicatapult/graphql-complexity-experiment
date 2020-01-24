const { ApolloServer, gql, UserInputError } = require('apollo-server-express')
const gqlComplexity = require('graphql-query-complexity')
const { separateOperations } = require('graphql')
const { makeExecutableSchema } = require('graphql-tools')

const estimators = [
  // complexity based on field extension in resolver
  gqlComplexity.fieldExtensionsEstimator(),
  // complexity based on SDL directives
  gqlComplexity.directiveEstimator(),
  // fallback complexity when no other value is provided
  gqlComplexity.simpleEstimator({ defaultComplexity: 1 }),
]

// Apollo type-defs SDL
const typeDefs = gql`
  # complexity directive definition used by directiveEstimator
  directive @complexity(value: Int!, multipliers: [String!]) on FIELD_DEFINITION

  type Query {
    tests(startIndex: Int!, endIndex: Int!): [Test!]!
  }

  type Test {
    index: Int!
    echoCount(val: Int!, count: Int!): [Int!]! @complexity(value: 2, multipliers: ["count"]) # complexity directive
  }
`

// Apollo resolvers
const resolvers = {
  Query: {
    tests: {
      resolve: (_, args) => {
        const result = []
        for (let index = args.startIndex; index < args.endIndex; index++) {
          result.push({ index })
        }
        return result
      },
      extensions: {
        // complexity field extension used by fieldExtensionsEstimator
        complexity: ({ args, childComplexity }) => childComplexity * (args.endIndex - args.startIndex),
      },
    },
  },

  Test: {
    echoCount: (_, args) => {
      const res = new Array(args.count)
      res.fill(args.val)
      return res
    },
  },
}

// build the schema to pass to both apollo and
const schema = makeExecutableSchema({ typeDefs, resolvers })
function createApolloServer() {
  const server = new ApolloServer({
    schema,
    // build a plugin to get the complexity of a query before running the resolvers
    // allows us to set a max complexity per query, or meter rate-limiting by complexity
    plugins: [
      {
        requestDidStart: () => ({
          didResolveOperation({ request, document }) {
            const complexity = gqlComplexity.getComplexity({
              schema,
              query: request.operationName ? separateOperations(document)[request.operationName] : document,
              variables: request.variables,
              estimators,
            })

            console.log('Used query complexity points:', complexity)

            if (complexity >= 200) {
              throw new UserInputError(
                `Sorry, too complicated query! ${complexity} is over 200 that is the max allowed complexity.`
              )
            }
          },
        }),
      },
    ],
  })

  return server
}

module.exports = createApolloServer
