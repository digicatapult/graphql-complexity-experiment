const { before, describe, it } = require('mocha')
const request = require('supertest')
const { expect } = require('chai')

const createHttpServer = require('../app/server')

const setupClient = context => {
  before(function() {
    context.server = createHttpServer()
    context.api = request(context.server)
    context.request = async ({ body }) => {
      let req = context.api.post('/graphql')
      req = req.set('Content-Type', 'application/json').send(body)
      const res = await req

      if (res.body.errors) {
        throw res.body.errors
      }

      return res.body
    }
  })
}

const mkPassingTest = ({ desc, body, result }) => {
  describe(desc, function() {
    const context = {}
    setupClient(context)

    before(async function() {
      context.result = await context.request({
        body,
      })
    })

    it('should respond successfully', function() {
      expect(context.result).to.deep.equal(result)
    })
  })
}

mkPassingTest({
  desc: 'within complexity limit',
  body: {
    query: `
    query {
      tests(startIndex: 3, endIndex: 5) {
        index
        echoCount(val: 42, count: 3)
      }
    }
  `,
  },
  result: {
    data: {
      tests: [
        {
          echoCount: [42, 42, 42],
          index: 3,
        },
        {
          echoCount: [42, 42, 42],
          index: 4,
        },
      ],
    },
  },
})

mkPassingTest({
  desc: 'within complexity limit multiple operations',
  body: [
    {
      operationName: 'query1',
      query: `
        query query1 {
          tests(startIndex: 3, endIndex: 5) {
            index
            echoCount(val: 42, count: 3)
          }
        }
      `,
    },
    {
      operationName: 'query2',
      query: `
        query query2 {
          tests(startIndex: 6, endIndex: 8) {
            index
            echoCount(val: 43, count: 3)
          }
        }
      `,
    },
  ],
  result: [
    {
      data: {
        tests: [
          {
            echoCount: [42, 42, 42],
            index: 3,
          },
          {
            echoCount: [42, 42, 42],
            index: 4,
          },
        ],
      },
    },
    {
      data: {
        tests: [
          {
            echoCount: [43, 43, 43],
            index: 6,
          },
          {
            echoCount: [43, 43, 43],
            index: 7,
          },
        ],
      },
    },
  ],
})

describe('exceeds complexity limit', function() {
  const context = {}
  setupClient(context)

  before(async function() {
    try {
      await context.request({
        body: {
          query: `
          query {
            tests(startIndex: 3, endIndex: 5) {
              index
              echoCount(val: 42, count: 50)
            }
          }
        `,
        },
      })
    } catch (err) {
      context.err = err
    }
  })

  it('should respond with UserError', function() {
    expect(context.err).to.deep.equal([
      {
        message: 'Sorry, too complicated query! 202 is over 200 that is the max allowed complexity.',
        extensions: {
          code: 'BAD_USER_INPUT',
        },
      },
    ])
  })
})
