import { VoiceSessionManager } from './voice-session-manager.js'
import { ConversationMemoryStore } from './conversation-memory-store.js'
import { TurnTakingController } from './turn-taking-controller.js'
import { AudioStreamController } from './audio-stream-controller.js'
import { VoiceActivityDetector } from './voice-activity-detector.js'
import { SessionAuditLog } from './session-audit-log.js'

export class RuntimeOrchestrator {
  constructor({sessionUrl='/assistant/realtime/ws'}={}){
    this.sessionUrl=sessionUrl
    this.session=new VoiceSessionManager()
    this.memory=new ConversationMemoryStore()
    this.audit=new SessionAuditLog()
    this.vad=new VoiceActivityDetector({
      onSpeechStart:()=>this.audit.write('speech-start'),
      onSpeechEnd:()=>this.audit.write('speech-end')
    })
    this.turns=new TurnTakingController({
      onTurnComplete:(text)=>this.completeUserTurn(text),
      onInterruption:()=>this.interruptAssistant()
    })
    this.audio=new AudioStreamController({
      onChunk:(chunk)=>this.handleAudioChunk(chunk),
      onLevel:(level)=>this.emit('audio-level',{level}),
      onError:(error)=>this.emit('audio-error',{error:String(error)})
    })
    this.listeners=new Set()
  }

  async start(){
    this.audit.write('runtime-start')
    this.session.on((type,data)=>this.handleSessionEvent(type,data))
    await this.session.connect(this.sessionUrl)
    await this.audio.start()
    this.emit('started')
  }

  stop(){
    this.audit.write('runtime-stop')
    this.audio.stop()
    this.session.disconnect()
    this.turns.reset()
    this.vad.reset()
    this.emit('stopped')
  }

  handleAudioChunk(chunk){
    const speaking=this.vad.process(chunk)
    if(speaking){
      this.session.send({type:'audio',data:Array.from(chunk)})
    }
  }

  handleSessionEvent(type,data){
    this.audit.write(`session-${type}`,{data})
    this.emit(type,{data})
  }

  completeUserTurn(text){
    this.memory.append({role:'user',content:text})
    this.session.send({type:'user-turn',text,memory:this.memory.recent(12)})
    this.emit('turn-complete',{text})
  }

  assistantStarted(){
    this.turns.assistantStarted()
    this.audit.write('assistant-started')
  }

  assistantStopped(){
    this.turns.assistantStopped()
    this.audit.write('assistant-stopped')
  }

  interruptAssistant(){
    this.session.send({type:'interrupt'})
    this.audit.write('assistant-interrupted')
    this.emit('interrupted')
  }

  on(listener){
    this.listeners.add(listener)
    return ()=>this.listeners.delete(listener)
  }

  emit(type,payload={}){
    this.listeners.forEach(listener=>listener(type,payload))
    try{
      window.dispatchEvent(new CustomEvent('indicare:runtime-orchestrator',{detail:{type,...payload}}))
    }catch{}
  }
}
