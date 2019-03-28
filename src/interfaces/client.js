'use strict'

const { base } = require('./base')
const assert = require('assert')
const { sec, min } = require('../utils/time')
const randomFromRange = require('../utils/random-from-range')

const log = require('debug')('kitsunet:telemetry:rpc-client')

exports.client = function client ({ restart }) {
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
    log(`MetaMask Mesh Testing - restarting in ${timeoutDuration / 1000} sec...`)
    setTimeout(() => restart(), timeoutDuration)
  }
}
