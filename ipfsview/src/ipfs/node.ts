import type { IPFS } from 'ipfs-core-types'
import { NOISE } from 'libp2p-noise'
import WS from "libp2p-websockets"
import WStar from "libp2p-webrtc-star"
import mplex from "libp2p-mplex"

export default class Node {
  private ipfs:IPFS = null
  private timeout:number = null

  public static init = async(repo, timeout) => {
    const node = new Node()
    node.ipfs = await require('ipfs').create({
      repo,
      libp2p: {
        modules: {
          transport: [WS, WStar],
          connEncryption: [NOISE],
          streamMuxer: [mplex]
        },
        addresses: {
          listen: [
            //'/ip4/127.0.0.1/tcp/13579/wss/p2p-webrtc-star',
            '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
          ]
        }
      }
    })
    node.timeout = timeout
    return node
  }

  public async id() {
    const id = await this.ipfs.id()
    return id.id
  }

  public async add(data:any) {
    const res = await this.ipfs.add(data)
    return res.cid.toString()
  }

  private async _cat(cid:string) {
    const stream = this.ipfs.cat(cid)
    let data = ""
    for await (const chunk of stream) {
      data += chunk.toString()
    }
    return data
  }

  public cat(cid:string) {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => {
        reject(new Error("timeout"))
      }, this.timeout)
      resolve(await this._cat(cid))
    })
  }

  public async subscribe(topic:string, listener) {
    await this.ipfs.pubsub.subscribe(topic, (msg:MessageEvent)=> {
      const data = new TextDecoder().decode(msg.data)
      listener(data)
    })
  }

  public async publish(topic:string, msg:string) {
    await this.ipfs.pubsub.publish(topic, new TextEncoder().encode(msg))
  }

  public async peers() {
    return await this.ipfs.swarm.peers()
  }

  public async subscribers(topic:string) {
    return await this.ipfs.pubsub.peers(topic)
  }

  public async privKey() {
    const res:any = await this.ipfs.config.get('Identity')
    return res.PrivKey
  }
}