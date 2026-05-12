export type RealtimeConnectionState='idle'|'connecting'|'connected'|'disconnected'|'error'

export class IndiCareRealtimeWebRTC {
  private pc: RTCPeerConnection | null = null
  private audioEl: HTMLAudioElement | null = null
  private state: RealtimeConnectionState = 'idle'

  constructor(private endpoint='/assistant/realtime/session'){}

  get connectionState(){
    return this.state
  }

  async connect(){
    this.state='connecting'

    const response=await fetch(this.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({mode:'voice'})
    })

    const session=await response.json()

    this.pc=new RTCPeerConnection()
    this.audioEl=document.createElement('audio')
    this.audioEl.autoplay=true

    this.pc.ontrack=(event)=>{
      if(this.audioEl){
        this.audioEl.srcObject=event.streams[0]
      }
    }

    this.pc.onconnectionstatechange=()=>{
      const next=this.pc?.connectionState

      if(next==='connected')this.state='connected'
      if(next==='disconnected'||next==='failed'||next==='closed')this.state='disconnected'
    }

    return session
  }

  disconnect(){
    this.pc?.close()
    this.pc=null
    this.state='disconnected'
  }
}
