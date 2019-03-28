'use strict'

const base = require('./base')

const log = require('debug')('kitsunet:telemetry:rpc-server')

module.exports = function (server, client) {
  return Object.assign(base(), {
    setPeerId: async (peerId) => {
      client.peerId = peerId
      // update network state
      const networkState = server.networkStore.getState()
      networkState.clients[peerId] = {}
      server.networkStore.putState(networkState)
    },
    submitNetworkState: async (clientState) => {
      const peerId = client.peerId
      if (!peerId) return
      if (!server.clients.includes(client)) return
      // update network state
      const networkState = server.networkStore.getState()
      networkState.clients[peerId] = clientState
      server.networkStore.putState(networkState)
    },
    disconnect: async (peerId) => {
      log(`client "${peerId}" sent disconnect request`)
      server.disconnectClient(client)
    }
  })
}
