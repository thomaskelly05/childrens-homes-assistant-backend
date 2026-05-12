export class ConversationMemoryStore {
  constructor(storageKey='indicare.conversation.memory'){
    this.storageKey=storageKey
    this.memory=this.load()
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
      localStorage.setItem(this.storageKey,JSON.stringify(this.memory.slice(-500)))
    }catch{}
  }

  append(event){
    this.memory.push({
      id:crypto.randomUUID(),
      timestamp:Date.now(),
      ...event
    })

    this.persist()
  }

  recent(limit=25){
    return this.memory.slice(-limit)
  }

  clear(){
    this.memory=[]
    this.persist()
  }
}
