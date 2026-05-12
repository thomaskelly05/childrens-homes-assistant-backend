export class SpeechSynthesisStream {
  constructor({voiceName='Samantha',onStart=()=>{},onEnd=()=>{},onError=()=>{}}={}){
    this.voiceName=voiceName
    this.onStart=onStart
    this.onEnd=onEnd
    this.onError=onError
    this.currentUtterance=null
  }

  speak(text){
    try{
      if(!window.speechSynthesis)return

      this.stop()

      const utterance=new SpeechSynthesisUtterance(text)

      const voices=window.speechSynthesis.getVoices()||[]
      const selected=voices.find(v=>v.name.includes(this.voiceName))||voices.find(v=>/en-GB/i.test(v.lang))||voices[0]

      if(selected)utterance.voice=selected

      utterance.rate=0.96
      utterance.pitch=1
      utterance.volume=1

      utterance.onstart=()=>this.onStart()
      utterance.onend=()=>this.onEnd()
      utterance.onerror=(e)=>this.onError(e)

      this.currentUtterance=utterance

      window.speechSynthesis.speak(utterance)
    }catch(error){
      this.onError(error)
    }
  }

  stop(){
    try{
      if(window.speechSynthesis.speaking){
        window.speechSynthesis.cancel()
      }
    }catch(error){
      this.onError(error)
    }
  }
}
