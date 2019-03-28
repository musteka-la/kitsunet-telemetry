'use strict'

const TelemetryClient = require('./client')
const { connectViaPost, connectViaWS } = require('./network')

module.exports = {
  TelemetryClient,
  connectViaPost,
  connectViaWS
}
