import { bootstrapOpenAIVoiceRuntime } from './realtime/openai-voice-runtime-bootstrap.js'
import { ORB_CARE_COMPANION_CONFIG, getOrbModeDetail } from './orb-care-companion-config.js'

const root = document.getElementById('orbAiRoot')
if (!root) throw new Error('ORB assistant root is missing')
if (window.__ORBCareCompanionRuntime) throw new Error('Duplicate ORB Care Companion runtime detected')
window.__ORBCareCompanionRuntime = true

const state = {
  active: false,
  connecting: false,
  connected: false,
  speaking: false,
  listening: false,
  level: 0,
  mode: ORB_CARE_COMPANION_CONFIG.defaultMode,
  status: 'Tap ORB to begin',
  detail: getOrbModeDetail(ORB_CARE_COMPANION_CONFIG.defaultMode),
  error: '',
  response: '',
  runtime: null,
  stopEvents: null
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}

function modeButtons() {
  return ORB_CARE_COMPANION_CONFIG.modes.map(mode => `
    <button class="orb-mode-pill" type="button" data-mode="${escapeHtml(mode)}" aria-pressed="${state.mode === mode}">${escapeHtml(mode)}</button>
  `).join('')
}

function render() {
  root.innerHTML = `
    <section class="orb-companion-shell" data-state="${state.active ? 'active' : 'idle'}">
      <header class="orb-companion-topbar">
        <div class="orb-companion-brand"><strong>ORB</strong><span>Care Companion</span></div>
        <nav class="orb-companion-modes" aria-label="ORB modes">${modeButtons()}</nav>
      </header>
      <main class="orb-companion-stage">
        <div>
          <button class="orb-companion-orb ${state.active ? 'is-active' : ''} ${state.speaking ? 'is-speaking' : ''} ${state.listening ? 'is-listening' : ''}" type="button" aria-pressed="${state.active}" aria-label="${state.active ? 'Stop ORB voice conversation' : 'Start ORB voice conversation'}" style="--voice-level:${Math.min(1, state.level).toFixed(3)}"></button>
          <div class="orb-companion-copy">
            <p class="eyebrow">${escapeHtml(state.connected ? 'Realtime voice connected' : state.connecting ? 'Connecting voice' : state.mode)}</p>
            <h1>${escapeHtml(state.active ? state.status : 'Guidance for the moments that matter')}</h1>
            <p>${escapeHtml(state.error || state.detail)}</p>
          </div>
        </div>
      </main>
      <footer>
        <form class="orb-companion-bottom">
          <input class="orb-companion-input" name="message" autocomplete="off" placeholder="Ask ORB for guidance, reflection or an Ofsted lens..." />
          <button class="orb-companion-send" type="submit">Ask</button>
        </form>
        ${state.response ? `<article class="orb-companion-response">${escapeHtml(state.response)}</article>` : ''}
      </footer>
    </section>
  `
  root.querySelector('.orb-companion-orb')?.addEventListener('click', toggleVoice, { once: true })
  root.querySelector('.orb-companion-bottom')?.addEventListener('submit', handleTypedMessage)
  root.querySelectorAll('.orb-mode-pill').forEach(button => {
    button.addEventListener('click', () => {
      state.mode = button.dataset.mode || ORB_CARE_COMPANION_CONFIG.defaultMode
      state.detail = getOrbModeDetail(state.mode)
      render()
    })
  })
}

async function handleTypedMessage(event) {
  event.preventDefault()
  const input = event.currentTarget.querySelector('input[name="message"]')
  const message = input?.value?.trim()
  if (!message) return
  input.value = ''
  state.status = 'Thinking'
  state.detail = 'ORB is considering the safest, clearest guidance.'
  state.response = ''
  state.error = ''
  render()
  try {
    const response = await fetch(ORB_CARE_COMPANION_CONFIG.endpoints.conversation, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message,
        mode: state.mode,
        conversation_id: window.__ORB_CONVERSATION_ID || null
      })
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.detail || payload?.error?.message || 'ORB request failed')
    state.response = payload.answer || payload.summary || 'ORB responded, but no answer text was returned.'
    if (payload.conversation_id) window.__ORB_CONVERSATION_ID = payload.conversation_id
    state.status = 'Ready'
    state.detail = getOrbModeDetail(state.mode)
  } catch (error) {
    state.error = String(error?.message || error)
    state.status = 'ORB could not respond'
  }
  render()
}

async function toggleVoice() {
  if (state.connecting) return
  if (state.active) return stopVoice()
  await startVoice()
}

async function startVoice() {
  state.active = true
  state.connecting = true
  state.connected = false
  state.speaking = false
  state.listening = true
  state.error = ''
  state.status = 'Listening'
  state.detail = 'Opening your microphone. Speak naturally to ORB.'
  render()
  try {
    const runtime = await bootstrapOpenAIVoiceRuntime()
    state.runtime = runtime
    if (!state.stopEvents) state.stopEvents = runtime.on(handleRuntimeEvent)
    await runtime.start()
    state.status = state.connected ? 'Listening' : 'Listening locally'
    state.detail = state.connected ? 'Speak naturally. ORB can be interrupted at any time.' : 'Microphone is open. Realtime voice is still connecting.'
  } catch (error) {
    state.error = String(error?.message || error)
    state.status = 'Voice connection failed'
    state.detail = 'Check microphone permissions and realtime session configuration.'
    state.runtime?.stop?.()
    state.active = false
    state.connected = false
    state.speaking = false
    state.listening = false
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
  state.status = 'Tap ORB to begin'
  state.detail = getOrbModeDetail(state.mode)
  state.error = ''
  render()
}

function handleRuntimeEvent(type, payload = {}) {
  if (type === 'started' || type === 'speech-start') { state.active = true; state.listening = true; state.status = 'Listening' }
  if (type === 'connected' || type === 'reconnected') { state.connected = true; state.status = 'Listening'; state.detail = 'Realtime voice connected. Speak naturally.' }
  if (type === 'disconnected' || type === 'reconnecting') { state.connected = false; state.status = type === 'reconnecting' ? 'Reconnecting' : 'Disconnected' }
  if (type === 'failed' || type === 'error' || type === 'audio-error') { state.error = String(payload.error?.message || payload.error || payload.reason || payload.message || 'Realtime voice error'); state.status = 'Voice failed' }
  if (type === 'audio-level') state.level = payload.level || 0
  if (type === 'assistant-speaking') { state.speaking = true; state.listening = false; state.status = 'Responding' }
  if (type === 'assistant-finished') { state.speaking = false; state.listening = true; state.status = 'Listening' }
  if (type === 'stopped') { state.active = false; state.connected = false; state.speaking = false; state.listening = false; state.level = 0; state.status = 'Tap ORB to begin' }
  render()
}

render()
