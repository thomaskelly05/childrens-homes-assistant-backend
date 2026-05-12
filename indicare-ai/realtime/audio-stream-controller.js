export class AudioStreamController {
  constructor({onChunk=()=>{},onLevel=()=>{},onError=()=>{}}={}){
    this.onChunk=onChunk
    this.onLevel=onLevel
    this.onError=onError
    this.stream=null
    this.audioContext=null
    this.processor=null
    this.source=null
  }

  async start(){
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({audio:true})

      this.audioContext=new (window.AudioContext||window.webkitAudioContext)()
      this.source=this.audioContext.createMediaStreamSource(this.stream)

      this.processor=this.audioContext.createScriptProcessor(4096,1,1)

      this.processor.onaudioprocess=(event)=>{
        const input=event.inputBuffer.getChannelData(0)

        let peak=0

        for(let i=0;i<input.length;i++){
          const value=Math.abs(input[i])
          if(value>peak)peak=value
        }

        this.onLevel(peak)
        this.onChunk(Float32Array.from(input))
      }

      this.source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
    }catch(error){
      this.onError(error)
    }
  }

  stop(){
    if(this.processor){
      this.processor.disconnect()
      this.processor=null
    }

    if(this.source){
      this.source.disconnect()
      this.source=null
    }

    if(this.stream){
      this.stream.getTracks().forEach(track=>track.stop())
      this.stream=null
    }

    if(this.audioContext){
      this.audioContext.close()
      this.audioContext=null
    }
  }
}
