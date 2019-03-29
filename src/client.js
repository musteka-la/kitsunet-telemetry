'use strict'

const assert = require('assert')
const isNode = require('detect-node')
const { createRpc } = require('./rpc')
const timeout = require('./utils/timeout')
const { sec } = require('./utils/time')

const {
  client: createClientInterface,
  server: createServerInterface
} = require('./interfaces')

const debug = require('debug')
const log = debug('kitsunet:telemetry:client')

const DEFAULT_SUBMIT_INTERVAL = 15 * sec

class TelemetryClient {
  constructor ({ clientId, submitInterval, connection }) {
    this.getState = () => {}
    this.clientId = clientId
    this.submitInterval = submitInterval || DEFAULT_SUBMIT_INTERVAL
    this.connection = connection

    assert(clientId, 'must provide clientId')

    const telemetryRpc = createRpc({
      clientInterface: createClientInterface({ restart }),
      serverInterface: createServerInterface(),
      connection
    })
    this.telemetryRpc = telemetryRpc

    async function restart () {
      if (isNode) {
        log('restart requested from telemetry server...')
        return
      }
      await telemetryRpc.disconnect(clientId)
      window.location.reload()
    }
  }

  start () {
    this.running = true
    this.telemetryRpc.setPeerId(this.clientId)
    this.submitStateOnInterval()
  }

  stop () {
    this.running = false
    this.telemetryRpc.disconnect()
  }

  async submitStateOnInterval () {
    try {
      while (this.running) {
        await this.submitState()
        await timeout(this.submitInterval)
      }
    } catch (err) {
      log(err)
    }
  }

  setStateHandler (handler) {
    this.getState = handler
  }

  async submitState () {
    const state = this.getState()
    await this.telemetryRpc.submitNetworkState(state)
  }
}

module.exports = TelemetryClient
