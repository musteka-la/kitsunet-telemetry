'use strict'

const TelemetryClient = require('./client')

module.exports = {
  TelemetryClient,
  network: require('./network'),
  utils: require('./utils'),
  interfaces: require('./interfaces'),
  rpc: require('./rpc')
}
