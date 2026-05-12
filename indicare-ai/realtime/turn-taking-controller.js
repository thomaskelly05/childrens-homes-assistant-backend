export class TurnTakingController {
  constructor({silenceMs=1200,onTurnComplete=()=>{},onInterruption=()=>{}}={}){
    this.silenceMs=silenceMs
    this.onTurnComplete=onTurnComplete
    this.onInterruption=onInterruption
    this.timer=null
    this.buffer=''
    this.speaking=false
  }

  userSpeech(text,{final=false}={}){
    if(this.speaking){
      this.onInterruption()
      this.speaking=false
    }

    if(text)this.buffer=(this.buffer+' '+text).replace(/\s+/g,' ').trim()

    clearTimeout(this.timer)

    if(final){
      this.complete()
      return
    }

    this.timer=setTimeout(()=>this.complete(),this.silenceMs)
  }

  assistantStarted(){
    clearTimeout(this.timer)
    this.speaking=true
  }

  assistantStopped(){
    this.speaking=false
  }

  complete(){
    clearTimeout(this.timer)
    const text=this.buffer.trim()
    this.buffer=''
    if(text)this.onTurnComplete(text)
  }

  reset(){
    clearTimeout(this.timer)
    this.buffer=''
    this.speaking=false
  }
}
