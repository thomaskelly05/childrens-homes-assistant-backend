export class VoiceActivityDetector {
  constructor({threshold=0.018,minActiveFrames=4,onSpeechStart=()=>{},onSpeechEnd=()=>{},onLevel=()=>{}}={}){
    this.threshold=threshold
    this.minActiveFrames=minActiveFrames
    this.onSpeechStart=onSpeechStart
    this.onSpeechEnd=onSpeechEnd
    this.onLevel=onLevel
    this.activeFrames=0
    this.speaking=false
    this.lastActive=0
  }

  process(samples){
    if(!samples||!samples.length)return false

    let total=0

    for(let i=0;i<samples.length;i++){
      total+=Math.abs(samples[i])
    }

    const level=total/samples.length

    this.onLevel(level)

    if(level>=this.threshold){
      this.activeFrames++
      this.lastActive=Date.now()

      if(!this.speaking&&this.activeFrames>=this.minActiveFrames){
        this.speaking=true
        this.onSpeechStart(level)
      }
    }else{
      this.activeFrames=Math.max(0,this.activeFrames-1)

      if(this.speaking&&Date.now()-this.lastActive>700){
        this.speaking=false
        this.onSpeechEnd(level)
      }
    }

    return this.speaking
  }

  reset(){
    this.activeFrames=0
    this.speaking=false
    this.lastActive=0
  }
}
