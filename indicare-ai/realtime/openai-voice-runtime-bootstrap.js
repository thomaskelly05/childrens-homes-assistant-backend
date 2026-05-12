import { RuntimeOrchestrator } from './runtime-orchestrator.js'
import { OpenAIRealtimeVoice } from './openai-realtime-voice.js'

export async function bootstrapOpenAIVoiceRuntime(){
  if(window.__IndiCareOpenAIRuntime)return window.__IndiCareOpenAIRuntime

  const realtime=new OpenAIRealtimeVoice({
    apiKey:window.OPENAI_API_KEY,
    voice:'alloy',
    onEvent(type,payload){
      try{
        window.dispatchEvent(new CustomEvent('indicare:openai-realtime',{
          detail:{type,payload}
        }))
      }catch{}
    }
  })

  const orchestrator=new RuntimeOrchestrator()

  orchestrator.on((type,payload)=>{
    if(type==='turn-complete'){
      realtime.send({
        type:'conversation.item.create',
        item:{
          type:'message',
          role:'user',
          content:[{type:'input_text',text:payload.text||''}]
        }
      })

      realtime.send({type:'response.create'})
    }
  })

  await realtime.connect()

  window.__IndiCareOpenAIRuntime={
    realtime,
    orchestrator,
    async start(){
      await orchestrator.start()
    },
    stop(){
      orchestrator.stop()
      realtime.disconnect()
    }
  }

  return window.__IndiCareOpenAIRuntime
}
