'use strict'

const { base } = require('./base')
const { sec } = require('../utils/time')

const pump = require('pump')
const asStream = require('obs-store/lib/asStream')
const throttleStream = require('throttle-obj-stream')

const { toDiffs } = require('../utils/json-patch-stream')
const { createJsonSerializeStream } = require('../utils/json-serialize-stream')

const debug = require('debug')
const log = debug('kitsunet:telemetry:rpc-admin')

const remoteCallTimeout = 45 * sec

exports.serverAdmin = function serverAdmin (server, clients, networkStore, conn) {
  return Object.assign(base(), {
    // server data
    getPeerCount: async () => {
      return clients.length
    },
    getNetworkState: async () => {
      return networkStore.getState()
    },
    // send to client
    sendToClient: async (clientId, method, args) => {
      log(`forwarding "${method}" with (${args}) to client ${clientId}`)
      const client = server.clients.find(c => c.peerId === clientId)
      if (!client) {
        log(`no client found ${clientId}`)
        return
      }
      return server.sendCallWithTimeout(client.rpcAsync, method, args, remoteCallTimeout)
    },
    // broadcast
    send: async (method, args) => {
      log(`broadcasting "${method}" with (${args}) to ${global.clients.length} client(s)`)
      return server.broadcastCall(method, args, remoteCallTimeout)
    },
    refresh: async () => {
      return server.broadcastCall('refresh', [], remoteCallTimeout)
    },
    refreshShortDelay: async () => {
      return server.broadcastCall('refreshShortDelay', [], remoteCallTimeout)
    },
    refreshLongDelay: async () => {
      return server.broadcastCall('refreshLongDelay', [], remoteCallTimeout)
    },
    createNetworkUpdateStream: async () => {
      const serializeStream = createJsonSerializeStream()
      pump(
        asStream(server.networkStore),
        // dont emit new values more than 2/sec
        throttleStream(500),
        toDiffs(),
        serializeStream,
        (err) => {
          if (err) log('admin diff stream broke', err)
        }
      )
      return serializeStream
    }
  })
}
