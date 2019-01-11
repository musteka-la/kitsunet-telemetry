'use strict'

const assert = require('assert')
const toStream = require('pull-stream-to-stream')
const endOfStream = require('end-of-stream')

const log = require('debug')('kitsunet:telemetry:client')

const rpc = require('./rpc/rpc')
const baseRpc = require('./rpc/base')

const pingWithTimeout = require('./network/pingWithTimeout')
const { sec, min } = require('./utils/time')

const peerPingInterval = 1 * min
const peerPingTimeout = 40 * sec

class KitsunetStatsTracker {
  constructor ({ kitsunetPeer, node, blockTracker, sliceTracker }) {
    assert(node, 'node required')
    assert(node, 'kitsunetPeer required')

    this.node = node
    this.kitsunetPeer = kitsunetPeer
    this.blockTracker = blockTracker
    this.sliceTracker = sliceTracker

    this.started = false
    this.node = node

    this.clientState = {
      // kitsunet peers
      peers: {},
      multicast: [],
      // kitsunet blocks + slices
      block: {},
      slices: {}
    }
  }

  _onConnect (conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        return log(err)
      }

      this.addPeer(peerInfo)
      log(`kitsunet peer connected ${peerInfo.id.toB58String()}`)

      const stream = toStream(conn)
      endOfStream(stream, (err) => {
        log(`peer rpcConnection disconnect ${peerInfo.id.toB58String()}`, err.message)
        this.kitsunetPeer.hangup(peerInfo)
      })

      const rpcServer = rpc.createRpcServer(baseRpc(), stream)
      const rpcClient = rpc.createRpcClient(baseRpc(), rpcServer)
      this._pingPeer({ rpc: rpcClient, kitsunetPeer: this.kitsunetPeer, peerInfo })
    })
  }

  _onDisconnect (peerInfo) {
    this.removePeer(peerInfo)
  }

  _onLatestBlockHeader (block) {
    const { number, stateRoot } = block
    this.clientState.block = {
      number,
      stateRoot,
      found: Date.now()
    }
  }

  _onLatestSlice (slice) {
    const sliceId = slice.sliceId
    const [stem, depth, root] = sliceId.split('-')
    const sliceGroup = `${stem}-${depth}`
    this.clientState.slices[sliceGroup] = {
      root,
      found: Date.now()
    }
  }

  async _pingPeer ({ rpc, kitsunetPeer, peerInfo }) {
    const b58Id = peerInfo.id.toB58String()
    try {
      const time = await pingWithTimeout(rpc, peerPingTimeout)
      let status = this.clientState.peers[b58Id]
      status = status || { status: '', ping: '' }
      status.ping = time
      status.status = 'connected'
      log(`successfully pinged ${b58Id}`)
    } catch (err) {
      log(`got error pinging ${b58Id}, hanging up`, err)
      return kitsunetPeer.hangup(peerInfo)
    }

    setTimeout(() => {
      this._pingPeer({ rpc, kitsunetPeer, peerInfo })
    }, peerPingInterval)
  }

  start () {
    // connections/disconnections
    this.kitsunetPeer.on('kitsunet:disconnect', this._onDisconnect.bind(this))
    this.kitsunetPeer.on('kitsunet:connection', this._onConnect.bind(this))

    // record latest block
    this.blockTracker.on('latest', this._onLatestBlockHeader.bind(this))

    // record latest slice
    this.sliceTracker.on('latest', this._onLatestSlice.bind(this))

    this.started = true
  }

  stop () {
    // connections/disconnections
    this.kitsunetPeer.removeEventListenner('kitsunet:disconnect', this._onDisconnect)
    this.kitsunetPeer.removeEventListenner('kitsunet:connection', this._onConnect)

    // record latest block
    this.blockTracker.removeEventListenner('latest', this._onLatestBlockHeader)

    // record latest slice
    this.sliceTracker.removeEventListenner('latest', this._onLatestSlice)

    this.started = false
  }

  getState () {
    return this.clientState
  }

  async addPeer (peerInfo) {
    const b58Id = peerInfo.id.toB58String()
    this.clientState.peers[b58Id] = { status: 'connected' }
  }

  async removePeer (peerInfo) {
    const b58Id = peerInfo.id.toB58String()
    delete this.clientState.peers[b58Id]
  }
}

module.exports = KitsunetStatsTracker
