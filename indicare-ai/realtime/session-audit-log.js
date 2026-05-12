export class SessionAuditLog {
  constructor(storageKey='indicare.runtime.audit'){
    this.storageKey=storageKey
    this.entries=this.load()
  }

  load(){
    try{
      const raw=localStorage.getItem(this.storageKey)
      return raw?JSON.parse(raw):[]
    }catch{
      return []
    }
  }

  persist(){
    try{
      localStorage.setItem(this.storageKey,JSON.stringify(this.entries.slice(-1000)))
    }catch{}
  }

  write(event,payload={}){
    const entry={
      id:crypto.randomUUID(),
      timestamp:new Date().toISOString(),
      event,
      payload
    }

    this.entries.push(entry)
    this.persist()

    return entry
  }

  recent(limit=50){
    return this.entries.slice(-limit)
  }

  clear(){
    this.entries=[]
    this.persist()
  }
}
