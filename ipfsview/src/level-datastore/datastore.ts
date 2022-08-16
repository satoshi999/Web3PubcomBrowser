import { LevelDatastore } from 'datastore-level'
import { Key } from 'interface-datastore'

export default class Datastore {
  private store
  constructor(path:string) {
    this.store = new LevelDatastore(path, {createIfMissing: true, errorIfExists:false})
    this.store.open()
  }

  public async get(key:string) {
    if(await this.store.has(new Key(key))) {
      return await this.store.get(new Key(key))
    } else {
      return null
    }
  }

  public async put(key:string, value:any) {
    await this.store.put(new Key(key), value)
  }
}