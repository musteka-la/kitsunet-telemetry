'use strict'

const pump = require('pump')
const pify = require('pify')
const { flatten, unflatten } = require('flat')
const promisify = require('promisify-this').default
const multiplexRpc = require('./network/multiplex-rpc')
const { cbifyObj } = require('./utils/cbify')

const debug = require('debug')
const log = debug('kitsunet:telemetry:rpc')

module.exports = {
  createRpc,
  createRpcServer,
  createRpcClient
}

function createRpc ({ clientInterface, serverInterface, connection }) {
  const rpcServer = createRpcServer(clientInterface, connection)
  const rpcClient = createRpcClient(serverInterface, rpcServer)
  return rpcClient
}

function createRpcServer (rpcInterface, connection) {
  const rawInterface = toLowLevelInterface(rpcInterface)
  const rpcServer = multiplexRpc(rawInterface)
  pump(
    connection,
    rpcServer,
    connection,
    (err) => {
      log(`rpc stream closed`, err)
    })
  return rpcServer
}

function createRpcClient (rpcInterface, rpcServer) {
  // use remote interface to create rpc api
  const rpcLowInterface = toLowLevelInterface(rpcInterface)
  const methodNames = Object.keys(rpcLowInterface)
  // add `:s` flad to stream functions so that they return streams
  const normalizedNames = methodNames.map((name) => name.match(/stream$/i) ? `${name}:s` : name)
  const rawRpcClient = rpcServer.wrap(normalizedNames)
  const rpcClient = toHighLevelInterface(rawRpcClient)
  // method to send by method string
  rpcClient.send = (name, ...args) => {
    return pify(cb => rpcServer.rpc(name, args, cb))()
  }
  return rpcClient
}

// low-level interface to high-level interface
function toLowLevelInterface (rpcInterface) {
  return cbifyObj(flatten(rpcInterface))
}

// high-level interface to low-level interface
function toHighLevelInterface (rpcInterface) {
  const highInterface = {}
  const methodNames = Object.keys(rpcInterface)
  methodNames.forEach((name) => {
    // ignore those that match 'stream' so they can synchronously return streams
    if (!name.match(/stream$/i)) {
      // callbacks -> promises
      highInterface[name] = promisify(rpcInterface[name], rpcInterface)
    } else {
      highInterface[name] = rpcInterface[name].bind(rpcInterface)
    }
  })
  // return final unflattened api
  return unflatten(highInterface)
}