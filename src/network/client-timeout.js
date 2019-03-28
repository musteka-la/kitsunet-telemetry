'use strict'

const pingWithTimeout = require('./ping-with-timeout')
const timeout = require('../utils/timeout')

const log = require('debug')('kitsunet:telemetry:network:client-timeout')

module.exports = { pingAllClientsOnInterval, pingClientWithTimeout }

async function pingAllClientsOnInterval ({
  clients,
  disconnectClient,
  heartBeatInterval,
  pingTimeout
}) {
  while (true) {
    try {
      await pingClientsWithTimeout()
    } catch (err) {
      log(err)
    }
    await timeout(heartBeatInterval)
  }

  // poll for connection status
  async function pingClientsWithTimeout () {
    // try all clients in sync
    await Promise.all(clients.map(async (client) => {
      return pingClientWithTimeout({ client, disconnectClient, pingTimeout })
    }))
  }
}

async function pingClientWithTimeout ({ client, disconnectClient, pingTimeout }) {
  try {
    return await pingWithTimeout(client.rpcAsync, pingTimeout)
  } catch (err) {
    await disconnectClient(client)
  }
}
