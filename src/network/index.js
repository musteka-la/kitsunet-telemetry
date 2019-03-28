'use strict'

const { pingAllClientsOnInterval, pingClientWithTimeout } = require('./client-timeout')
const { connectViaPost, connectViaWs } = require('./telemetry')

const multiplexRpc = require('./multiplex-rpc')
const pingWithTimeout = require('./ping-with-timeout')

module.exports = {
  pingAllClientsOnInterval,
  pingClientWithTimeout,
  multiplexRpc,
  pingWithTimeout,
  connectViaPost,
  connectViaWs
}
