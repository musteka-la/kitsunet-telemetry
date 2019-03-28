'use strict'

const pump = require('pump')
const { cbifyObj } = require('./utils/cbify')
const promisify = require('promisify-this')
const multiplexRpc = require('./network/multiplex-rpc')

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
  const rawInterface = cbifyObj(rpcInterface)
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
  const methodNames = Object.keys(rpcInterface)
  const normalizedNames = methodNames.map((name) => name.match(/stream$/i) ? `${name}:s` : name)
  const rawRpcClient = rpcServer.wrap(normalizedNames)
  const rpcClient = promisify(rawRpcClient)
  return rpcClient
}
