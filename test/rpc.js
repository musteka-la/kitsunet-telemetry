const test = require('tape')
const pump = require('pump')
const duplexify = require('duplexify')
const PassThroughStream = require('readable-stream').PassThrough

const { createRpc } = require('../src/rpc')

test('basic rpc test', async (t) => {
  const clientAResults = {}
  const clientBResults = {}

  const {
    clientARemote,
    clientBRemote
  } = prepareTest({
    clientAInterface: {
      async xyz () {
        clientAResults.xyz = true
        return 'xyz'
      }
    },
    clientBInterface: {
      async abc () {
        clientBResults.abc = true
        return 'abc'
      }
    }
  })

  t.notOk(clientAResults.xyz)
  t.notOk(clientBResults.abc)
  
  const xyzResult = await clientARemote.xyz()
  const abcResult = await clientBRemote.abc()

  t.equal(xyzResult, 'xyz')
  t.equal(abcResult, 'abc')

  t.ok(clientAResults.xyz)
  t.ok(clientBResults.abc)

  t.end()
})

test('deep rpc test', async (t) => {
  const results = {}
  const deepInterface = {
    a: {
      b: {
        c: async () => {
          results.deep = true
          return 'deep'
        }
      }
    }
  }

  const {
    clientARemote,
    clientBRemote
  } = prepareTest({
    clientAInterface: deepInterface,
    clientBInterface: {},
  })

  t.notOk(results.deep)
  
  const callResult = await clientARemote.a.b.c()

  t.equal(callResult, 'deep')
  t.ok(results.deep)

  t.end()
})

function prepareTest ({ clientAInterface, clientBInterface }) {
  const { connectionA, connectionB } = createConnections()
  const clientBRemote = createRpc({
    clientInterface: clientAInterface,
    serverInterface: clientBInterface,
    connection: connectionA,
  })
  const clientARemote = createRpc({
    clientInterface: clientBInterface,
    serverInterface: clientAInterface,
    connection: connectionB,
  })

  return {
    clientARemote,
    clientBRemote
  }
}

function createConnections () {
  const linkA = new PassThroughStream()
  const linkB = new PassThroughStream()
  const connectionA = duplexify(linkA, linkB)
  const connectionB = duplexify(linkB, linkA)
  return { connectionA, connectionB }
}