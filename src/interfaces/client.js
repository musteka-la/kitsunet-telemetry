'use strict'

const { base } = require('./base')
const assert = require('assert')
const { sec, min } = require('../utils/time')
const randomFromRange = require('../utils/random-from-range')

const debug = require('debug')
const log = debug('kitsunet:telemetry:rpc-client')

const noop = () => { }
exports.client = function client (rpcInterface) {
  return Object.assign(base(), rpcInterface)
}