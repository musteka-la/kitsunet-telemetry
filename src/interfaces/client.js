'use strict'

const { base } = require('./base')
const assert = require('assert')
const { sec, min } = require('../utils/time')
const randomFromRange = require('../utils/random-from-range')

const debug = require('debug')
const log = debug('kitsunet:telemetry:rpc-client')

const noop = () => { }
exports.client = function client ({ restart } = { restart: noop }) {
  assert(restart, 'must provide restart function')

  return Object.assign(base(), {
    refresh: async () => {
      return restart()
    },
    refreshShortDelay: () => {
      return restartWithDelay(randomFromRange(5 * sec, 10 * sec))
    },
    refreshLongDelay: async () => {
      return restartWithDelay(randomFromRange(2 * min, 10 * min))
    }
  })

  async function restartWithDelay (timeoutDuration) {
    log(`Telemetry - restarting in ${timeoutDuration / 1000} sec...`)
    setTimeout(() => restart(), timeoutDuration)
  }
}
