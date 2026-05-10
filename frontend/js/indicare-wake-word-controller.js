/* IndiCare Wake Word Controller
   Browser-safe wake phrase controller using the central RuntimeCore.
   This does not silently record: users must enable it from the assistant session.
*/
(function () {
  if (window.IndiCareWakeWordController?.version) return;

  const WAKE_KEY = 'indicare_wake_word_enabled';
  const WAKE_PHRASES = ['hey indicare', 'hi indicare', 'okay indicare', 'ok indicare'];
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const state = {
    version: '1.0.0',
    supported: Boolean(SpeechRecognition),
    enabled: localStorage.getItem(WAKE_KEY) === 'true',
    listening: false,
    recognition: null,
    cooldownUntil: 0,
    restartTimer: 0,
    lastTranscript: '',
    lastWakeAt: 0,
    error: null
  };

  function core() {
    return window.IndiCareRuntimeCore;
  }

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`indicare:wake:${name}`, { detail: detail || snapshot() }));
  }

  function snapshot() {
    return {
      version: state.version,
      supported: state.supported,
      enabled: state.enabled,
      listening: state.listening,
      lastTranscript: state.lastTranscript,
      lastWakeAt: state.lastWakeAt,
      error: state.error
    };
  }

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function containsWakePhrase(text) {
    const t = normalise(text);
    return WAKE_PHRASES.some((phrase) => t.includes(phrase));
  }

  function openAssistantVoice() {
    core()?.setListening?.();
    if (window.IndiCareVoiceCompanion?.open) {
      window.IndiCareVoiceCompanion.open();
      return true;
    }
    const button = document.querySelector('#voiceOrb, #openVoiceCompanion, .voice-trigger, .mic-btn');
    if (button) {
      button.click();
      return true;
    }
    return false;
  }

  function onWake(transcript) {
    const now = Date.now();
    if (now < state.cooldownUntil) return;
    state.cooldownUntil = now + 3500;
    state.lastWakeAt = now;
    state.lastTranscript = transcript;
    core()?.markChatStarted?.();
    core()?.setListening?.();
    emit('detected', { transcript, at: now });
    openAssistantVoice();
  }

  function buildRecognition() {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    recognition.onstart = () => {
      state.listening = true;
      state.error = null;
      document.body?.classList.add('ic-wake-listening');
      emit('listening');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || '';
      }
      state.lastTranscript = transcript;
      if (containsWakePhrase(transcript)) onWake(transcript);
    };

    recognition.onerror = (event) => {
      state.error = event.error || 'speech_recognition_error';
      emit('error', { error: state.error });
      if (['not-allowed', 'service-not-allowed'].includes(state.error)) {
        disable(false);
      }
    };

    recognition.onend = () => {
      state.listening = false;
      document.body?.classList.remove('ic-wake-listening');
      emit('stopped');
      if (state.enabled && !document.hidden) {
        window.clearTimeout(state.restartTimer);
        state.restartTimer = window.setTimeout(() => start(false), 850);
      }
    };

    return recognition;
  }

  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks?.().forEach((track) => track.stop());
      return true;
    } catch (error) {
      state.error = error?.message || 'microphone_permission_failed';
      emit('error', { error: state.error });
      return false;
    }
  }

  async function enable() {
    if (!state.supported) {
      state.error = 'speech_recognition_not_supported';
      emit('unsupported');
      return snapshot();
    }
    const ok = await ensureMicPermission();
    if (!ok) return snapshot();
    state.enabled = true;
    localStorage.setItem(WAKE_KEY, 'true');
    start(false);
    emit('enabled');
    return snapshot();
  }

  function disable(clearStorage) {
    state.enabled = false;
    if (clearStorage !== false) localStorage.setItem(WAKE_KEY, 'false');
    window.clearTimeout(state.restartTimer);
    if (state.recognition) {
      try { state.recognition.onend = null; state.recognition.stop(); } catch (_) { /* ignore */ }
    }
    state.listening = false;
    document.body?.classList.remove('ic-wake-listening');
    emit('disabled');
    return snapshot();
  }

  function start(force) {
    if (!state.supported || (!state.enabled && !force) || document.hidden) return snapshot();
    if (state.listening) return snapshot();
    if (!state.recognition) state.recognition = buildRecognition();
    try {
      state.recognition.start();
    } catch (error) {
      state.error = error?.message || 'wake_start_failed';
      emit('error', { error: state.error });
    }
    return snapshot();
  }

  function stop() {
    if (state.recognition) {
      try { state.recognition.stop(); } catch (_) { /* ignore */ }
    }
    state.listening = false;
    document.body?.classList.remove('ic-wake-listening');
    emit('stopped');
    return snapshot();
  }

  function installButtonHooks() {
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-indicare-wake-toggle], #wakeWordToggle');
      if (!toggle) return;
      if (state.enabled) disable();
      else enable();
    });
  }

  function installLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (state.enabled) start(false);
    });
  }

  function init() {
    installButtonHooks();
    installLifecycle();
    if (state.enabled) start(false);
    emit('ready');
  }

  window.IndiCareWakeWordController = {
    version: state.version,
    snapshot,
    enable,
    disable,
    start,
    stop,
    isSupported: () => state.supported,
    phrases: () => [...WAKE_PHRASES]
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
