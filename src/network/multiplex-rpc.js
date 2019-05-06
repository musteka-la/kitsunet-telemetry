'use strict'

const RPC = require('rpc-stream')
const multiplex = require('multiplex')
const pump = require('pump')

const debug = require('debug')
const log = debug('kitsunet:telemetry:network:multiplex-rpc')

module.exports = function (api) {
  let streamCount = 2

  // internal rpc
  const irpc = RPC({
    open: function (id, name, args) {
      if (typeof api[name] !== 'function') return
      args = [].splice.call(args)
      args.push((err, stream) => {
        if (err) {
          throw err
        }
        if (!stream || typeof stream.pipe !== 'function') return
        pump(
          stream,
          mx.createSharedStream(id),
          stream,
          (err) => {
            log(`multiplexRpc internal child "${id}" stream ended`, err.message)
          }
        )
      })
      api[name].apply(null, args)
    }
  })
  const iclient = irpc.wrap([ 'open' ])

  // public interface
  const prpc = RPC(api, {
    flattenError: (err) => {
      if (!(err instanceof Error)) return err
      log('sending error over rpc', err)
      return {
        message: err.message,
        stack: err.stack
      }
    }
  })

  const mx = multiplex({ chunked: true })
  pump(
    irpc,
    mx.createSharedStream('0'),
    irpc,
    (err) => {
      log('multiplexRpc internal stream ended', err.message)
    }
  )
  pump(
    prpc,
    mx.createSharedStream('1'),
    prpc,
    (err) => {
      log('multiplexRpc public stream ended', err.message)
    }
  )

  mx.wrap = function (methods) {
    const m = typeof methods.map === 'undefined' ? Object.keys(methods) : methods
    const names = m.map(function (m) {
      return m.split(':')[0]
    })
    const wrapped = prpc.wrap(names)
    m.forEach(function (m) {
      const parts = m.split(':')
      const name = parts[0]
      if (parts[1] === 's') {
        wrapped[name] = wrapStream(name)
      }
    })
    return wrapped
  }
  return mx

  function wrapStream (name) {
    return function () {
      const args = [].slice.call(arguments)
      const id = String(streamCount++)
      iclient.open(id, name, args)
      return mx.createSharedStream(id)
    }
  }
}
