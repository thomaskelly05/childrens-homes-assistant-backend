import { bootstrapOpenAIVoiceRuntime } from './realtime/openai-voice-runtime-bootstrap.js'

const root = document.getElementById('indicareAiRoot')

if (!root) {
  throw new Error('IndiCare assistant root is missing')
}

if (window.__IndiCareAssistantRuntime) {
  throw new Error('Duplicate IndiCare assistant runtime detected')
}

window.__IndiCareAssistantRuntime = true

const state = {
  active: false,
  connecting: false,
  connected: false,
  speaking: false,
  listening: false,
  level: 0,
  status: 'Tap the orb to begin',
  detail: 'Realtime voice only. No text panel. No legacy renderer.',
  error: '',
  runtime: null,
  stopEvents: null
}

function render() {
  root.innerHTML = `
    <section class="voice-shell" data-state="${state.active ? 'active' : 'idle'}">
      <div class="ambient ambient-one"></div>
      <div class="ambient ambient-two"></div>
      <div class="ambient ambient-three"></div>

      <div class="voice-presence" aria-live="polite">
        <div class="presence-dot ${state.connected ? 'is-live' : ''}"></div>
        <span>${state.connected ? 'OpenAI realtime connected' : state.connecting ? 'Connecting realtime voice' : 'IndiCare Intelligence'}</span>
      </div>

      <button class="voice-orb ${state.active ? 'is-active' : ''} ${state.speaking ? 'is-speaking' : ''} ${state.listening ? 'is-listening' : ''}"
        type="button"
        aria-pressed="${state.active}"
        aria-label="${state.active ? 'Stop voice conversation' : 'Start voice conversation'}"
        style="--voice-level:${Math.min(1, state.level).toFixed(3)}">
        <span class="orb-ring orb-ring-one"></span>
        <span class="orb-ring orb-ring-two"></span>
        <span class="orb-core"></span>
      </button>

      <div class="voice-copy">
        <p class="eyebrow">Continuous voice conversation</p>
        <h1>${state.active ? state.status : 'Talk naturally'}</h1>
        <p>${state.error || state.detail}</p>
      </div>
    </section>
  `

  root.querySelector('.voice-orb')?.addEventListener('click', toggleVoice, { once: true })
}

async function toggleVoice() {
  if (state.connecting) return
  if (state.active) {
    stopVoice()
    return
  }
  await startVoice()
}

async function startVoice() {
  state.connecting = true
  state.error = ''
  state.status = 'Requesting microphone'
  state.detail = 'Allow microphone access to start a continuous realtime conversation.'
  render()

  try {
    const runtime = await bootstrapOpenAIVoiceRuntime()
    state.runtime = runtime

    if (!state.stopEvents) {
      state.stopEvents = runtime.on(handleRuntimeEvent)
    }

    await runtime.start()

    state.active = true
    state.listening = true
    state.status = 'Listening'
    state.detail = 'Speak naturally. Interruptions and turn-taking stay inside the single realtime runtime.'
  } catch (error) {
    state.error = String(error?.message || error)
    state.status = 'Voice failed'
    state.detail = 'Realtime voice failed fast; no legacy renderer was started.'
    console.error('[IndiCare voice] start failed', error)
  } finally {
    state.connecting = false
    render()
  }
}

function stopVoice() {
  state.runtime?.stop()
  state.active = false
  state.connected = false
  state.speaking = false
  state.listening = false
  state.level = 0
  state.status = 'Tap the orb to begin'
  state.detail = 'Realtime voice only. No text panel. No legacy renderer.'
  render()
}

function handleRuntimeEvent(type, payload = {}) {
  if (type === 'connected' || type === 'reconnected') {
    state.connected = true
    state.status = 'Listening'
  }

  if (type === 'disconnected' || type === 'reconnecting') {
    state.connected = false
    state.status = type === 'reconnecting' ? 'Reconnecting' : 'Disconnected'
  }

  if (type === 'failed' || type === 'error' || type === 'audio-error') {
    state.error = String(payload.error?.message || payload.error || payload.reason || 'Realtime voice error')
    state.status = 'Voice failed'
  }

  if (type === 'audio-level') {
    state.level = payload.level || 0
  }

  if (type === 'speech-start') {
    state.listening = true
    state.status = 'Listening'
  }

  if (type === 'assistant-speaking') {
    state.speaking = true
    state.listening = false
    state.status = 'Responding'
  }

  if (type === 'assistant-finished') {
    state.speaking = false
    state.listening = true
    state.status = 'Listening'
  }

  render()
}

render()
