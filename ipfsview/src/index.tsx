import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as IpfsNode from './ipfs/node'
import Datastore from './level-datastore/datastore'

type Comment = {
  from: string
  date: number
  text: string
}

type PublishCid = {
  from: string
  to?: string
  url: string
  cid: string
}

type RequestCids = {
  from: string
  url: string
}

interface iState {
  msg:string
  url: string
  peerId:string
  tableData: {[key:string]: Comment}
}

class Main extends React.Component<{}, iState> {
  private ipfs:IpfsNode.default
  private datastore: Datastore

  private peerRef
  private subscriberRef
  private inputRef

  constructor(state:iState) {
    super(state);
    this.state = {
      msg:null,
      url: null,
      peerId: null,
      tableData: {}
    }

    this.inputRef = React.createRef()
    this.peerRef = React.createRef()
    this.subscriberRef = React.createRef()

    this.onNativeMessage = this.onNativeMessage.bind(this)
    this.onPublishCid = this.onPublishCid.bind(this)
    this.onRequestCids = this.onRequestCids.bind(this)
  }

  async getCids(url:string) {
    let cids = new Set<string>()
    const data = await this.datastore.get(url)
    if(data) {
      try {
        cids = new Set<string>(JSON.parse(data))
      } catch (e) {}
    }
    return cids
  }

  async putCid(cid:string, url:string) {
    let cids = new Set<string>()

    const data = await this.datastore.get(url)

    if(data) {
      try {
        cids = new Set<string>(JSON.parse(data))
      } catch (e) {}
    }
    if(!cids.has(cid)) {
      cids.add(cid)
      await this.datastore.put(url, JSON.stringify(Array.from(cids)))
    }
  }

  async getComment(cid:string) {
    let comment:Comment = null
    try {
      const data = await this.ipfs.cat(cid) as string
      comment = JSON.parse(data)
    } catch (e) {}

    return comment
  }

  async onRequestCids(msg) {
    let json:RequestCids = null
    try {
      json = JSON.parse(msg)
    } catch (e) {}

    if(!json) return
    if(json.from === this.state.peerId) return

    const cids = await this.getCids(json.url)
    const array = Array.from(cids)
    for(const cid of array) {
      const message:PublishCid = {url: json.url, cid, from: this.state.peerId, to:json.from}
      await this.ipfs.publish('PUBLISH_CID', JSON.stringify(message))
    }
  }

  async loadTableData(url:string) {
    const tableData = {}
    const cids = await this.getCids(url)

    const array = Array.from(cids)

    for(const cid of array) {
      const comment = await this.getComment(cid)
      if(comment) {
        tableData[cid] = comment
      }
    }
    return tableData
  }

  async onPublishCid(msg) {
    let json:PublishCid = null
    try {
      json = JSON.parse(msg)
    } catch (e) {}

    if(!json) return
    if(json.from === this.state.peerId) return
    if(json.to && json.to !== this.state.peerId) return   
    if(json.url !== this.state.url) return
    if(this.state.tableData[json.cid]) return

    const comment = await this.getComment(json.cid)
    if(comment) {
      await this.putCid(json.cid, json.url)

      const tableData = {...this.state.tableData}
      tableData[json.cid] = comment
      this.setState({tableData})  
    }
  }

  async sync() {
    if(!this.state.url || this.state.url.length == 0) return
    if(!this.state.peerId || this.state.peerId.length == 0) return

    const tableData = await this.loadTableData(this.state.url)

    const cids = Object.keys(tableData)
    for(const cid of cids) {
      const message:PublishCid = {url: this.state.url, cid, from: this.state.peerId}
      await this.ipfs.publish('PUBLISH_CID', JSON.stringify(message))
    }

    this.setState({tableData}, async()=> {
      const message:RequestCids = {url: this.state.url, from: this.state.peerId}
      await this.ipfs.publish('REQUEST_CIDS', JSON.stringify(message))
    })
  }

  async onNativeMessage(e:MessageEvent) {
    const url = e.data

    if(this.state.url === url) return
    if(!this.state.peerId || this.state.peerId.length == 0) return

    this.setState({url})

    const tableData = await this.loadTableData(url)
    this.setState({tableData}, async()=> {
      const message:RequestCids = {url, from: this.state.peerId}
      await this.ipfs.publish('REQUEST_CIDS', JSON.stringify(message))
    })
  }

  async componentDidMount() {
    window.addEventListener('message', this.onNativeMessage)
    document.addEventListener('message', this.onNativeMessage)

    this.ipfs = await IpfsNode.default.init('ipfs', 120000)
    await this.ipfs.subscribe('PUBLISH_CID', this.onPublishCid)
    await this.ipfs.subscribe('REQUEST_CIDS', this.onRequestCids)

    this.datastore = new Datastore('datastore')

    const id = await this.ipfs.id()
    this.setState({peerId:id})


    setInterval(async() => {
      const peers = await this.ipfs.peers()
      this.peerRef.current.value = ""
      for (const peer of peers) {
        this.peerRef.current.value += peer.peer + "\n"
      }

      const subscribers = await this.ipfs.subscribers('PUBLISH_CID')
      this.subscriberRef.current.value = ""
      for (const subscriber of subscribers) {
        this.subscriberRef.current.value += subscriber + '\n'
      }
    }, 1000)
  }

  async addComment() {
    if(!this.state.url || this.state.url.length == 0) return
    if(!this.state.peerId || this.state.peerId.length == 0) return

    const text = this.inputRef.current.value

    if(!text || text.length == 0) return

    const comment:Comment = {from:this.state.peerId, date: new Date().getTime(), text}
    const cid = await this.ipfs.add(JSON.stringify(comment))

    await this.putCid(cid, this.state.url)

    const tableData = {...this.state.tableData}
    tableData[cid] = comment

    this.setState({tableData})

    this.inputRef.current.value = ""

    const message:PublishCid = {url: this.state.url, cid, from: this.state.peerId}
    await this.ipfs.publish('PUBLISH_CID', JSON.stringify(message))
  }

  render() {
    return (
      <div id="root">
        <br/>
        <div>peerId:{this.state.peerId}</div>
        <br/>
        <div>url:{this.state.url}</div>
        <br/>
        <button onClick={() => {this.sync()}} >sync</button>
        <br/>
        {
          Object.keys(this.state.tableData).length > 0 && 
          <table style={{border: "solid 1px"}}>
            <tbody>
            {
              Object.values(this.state.tableData).map(comment => {
                return (
                  <tr>
                    <td style={{border: "solid 1px"}}>{comment.text}</td>
                  </tr>
                )
              })
            }
            </tbody>
          </table>
        }
        <br/>
        <textarea ref={this.inputRef}></textarea>
        <br/>
        <button onClick={() => {this.addComment()}} >add comment</button>
        <br/>
        <br/>
        <div>subscribers</div>
        <textarea readOnly ref={this.subscriberRef} style={{width:'100%', height:'100vh'}}></textarea>
        <br/>
        <br/>
        <div>peers</div>
        <textarea readOnly ref={this.peerRef} style={{width:'100%', height:'100vh'}}></textarea>
        <br/>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Main />,
  document.getElementById('root')
);