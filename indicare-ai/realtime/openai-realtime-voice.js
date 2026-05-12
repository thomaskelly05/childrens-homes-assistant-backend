export class OpenAIRealtimeVoice {
  constructor({apiKey,model='gpt-4o-realtime-preview',voice='alloy',onEvent=()=>{}}={}){
    this.apiKey=apiKey||window.OPENAI_API_KEY||''
    this.model=model
    this.voice=voice
    this.onEvent=onEvent
    this.socket=null
    this.connected=false
  }

  async connect(){
    if(this.connected)return

    const url=`wss://api.openai.com/v1/realtime?model=${this.model}`

    this.socket=new WebSocket(url,[
      'realtime',
      `openai-insecure-api-key.${this.apiKey}`,
      'openai-beta.realtime-v1'
    ])

    this.socket.onopen=()=>{
      this.connected=true

      this.send({
        type:'session.update',
        session:{
          voice:this.voice,
          instructions:'You are IndiCare Intelligence. Speak as a calm emotionally intelligent British female professional supporting residential care adults.',
          modalities:['text','audio']
        }
      })

      this.onEvent('connected')
    }

    this.socket.onclose=()=>{
      this.connected=false
      this.onEvent('disconnected')
    }

    this.socket.onerror=(error)=>{
      this.onEvent('error',error)
    }

    this.socket.onmessage=(event)=>{
      try{
        const payload=JSON.parse(event.data)
        this.onEvent(payload.type,payload)
      }catch(error){
        this.onEvent('parse-error',error)
      }
    }
  }

  send(event){
    if(!this.socket||this.socket.readyState!==1)return
    this.socket.send(JSON.stringify(event))
  }

  sendAudio(float32Audio){
    const pcm16=new Int16Array(float32Audio.length)

    for(let i=0;i<float32Audio.length;i++){
      const sample=Math.max(-1,Math.min(1,float32Audio[i]))
      pcm16[i]=sample<0?sample*0x8000:sample*0x7fff
    }

    const bytes=new Uint8Array(pcm16.buffer)
    let binary=''

    for(let i=0;i<bytes.byteLength;i++){
      binary+=String.fromCharCode(bytes[i])
    }

    this.send({
      type:'input_audio_buffer.append',
      audio:btoa(binary)
    })
  }

  commitAudio(){
    this.send({type:'input_audio_buffer.commit'})
    this.send({type:'response.create'})
  }

  interrupt(){
    this.send({type:'response.cancel'})
  }

  disconnect(){
    if(this.socket)this.socket.close()
    this.connected=false
  }
}
