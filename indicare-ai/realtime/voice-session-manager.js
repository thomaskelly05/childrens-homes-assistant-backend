export class VoiceSessionManager {
  constructor(){
    this.socket=null
    this.connected=false
    this.listeners=new Set()
  }

  async connect(url){
    if(this.connected)return

    this.socket=new WebSocket(url)

    this.socket.onopen=()=>{
      this.connected=true
      this.emit('connected')
    }

    this.socket.onclose=()=>{
      this.connected=false
      this.emit('disconnected')
    }

    this.socket.onerror=(error)=>{
      this.emit('error',error)
    }

    this.socket.onmessage=(event)=>{
      this.emit('message',event.data)
    }
  }

  send(payload){
    if(!this.socket||this.socket.readyState!==1)return
    this.socket.send(JSON.stringify(payload))
  }

  disconnect(){
    if(this.socket)this.socket.close()
  }

  on(listener){
    this.listeners.add(listener)
    return ()=>this.listeners.delete(listener)
  }

  emit(type,data){
    this.listeners.forEach(listener=>listener(type,data))
  }
}
