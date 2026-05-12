import { OpenAIRealtimeVoice } from './openai-realtime-voice.js'
import { RuntimeOrchestrator } from './runtime-orchestrator.js'

export async function bootstrapOpenAIVoiceRuntime() {
  if (window.__IndiCareOpenAIRuntime) return window.__IndiCareOpenAIRuntime

  const listeners = new Set()
  const realtime = new OpenAIRealtimeVoice({
    apiKey: window.OPENAI_API_KEY,
    voice: window.INDICARE_REALTIME_VOICE || 'alloy',
    onEvent(type, payload) {
      orchestrator.handleRealtimeEvent(type, payload)
    }
  })

  const orchestrator = new RuntimeOrchestrator({ realtime })
  orchestrator.on((type, payload) => listeners.forEach(listener => listener(type, payload)))

  window.__IndiCareOpenAIRuntime = {
    realtime,
    orchestrator,
    async start() {
      await orchestrator.start()
    },
    stop() {
      orchestrator.stop()
    },
    on(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }

  return window.__IndiCareOpenAIRuntime
}
