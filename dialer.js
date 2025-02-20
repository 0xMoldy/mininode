/* eslint-disable no-console */

import { Multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from './libp2p.js'
import {stdinToStream, streamToBus, streamToConsole} from './stream.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import peerIdDialerJson from './peer-id-dialer.js'
import peerIdListenerJson from './peer-id-listener.js'
import map from "it-map";
import * as lp from "it-length-prefixed";
import {pipe} from 'it-pipe'

async function run () {
  const [idDialer, idListener] = await Promise.all([
    createFromJSON(peerIdDialerJson),
    createFromJSON(peerIdListenerJson)
  ])

  // Create a new libp2p node on localhost with a randomly chosen port
  const nodeDialer = await createLibp2p({
    peerId: idDialer,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    }
  })

  // Start the libp2p host
  await nodeDialer.start()
  console.log(nodeDialer)

  // Output this node's address
  console.log('Dialer ready, listening on:')
  nodeDialer.getMultiaddrs().forEach((ma) => {
    console.log(ma.toString())
  })

  // Dial to the remote peer (the "listener")
  const listenerMa = new Multiaddr(`/ip4/127.0.0.1/tcp/10333/p2p/${idListener.toString()}`)
  const { stream } = await nodeDialer.dialProtocol(listenerMa, '/req/1.0.0')

  console.log('Dialer dialed to listener on protocol: /req/1.0.0')
  console.log('Type a message and see what happens')

  // Send stdin to the stream
  pipe(
      ["kbrav\\n"],
      (source) => map(source, (string) => uint8ArrayFromString(string)),
      lp.encode(),
      stream.sink
  )

  nodeDialer.connectionManager.addEventListener('peer:connect', (evt) => {
  })

  await nodeDialer.handle('/res/1.0.0', async ({ connection, stream }) => {
    streamToConsole(stream)
  })

  while (true) {}

}

run()
