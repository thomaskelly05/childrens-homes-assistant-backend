/* IndiCare Runtime Core
   Central convergence layer for assistant UI, voice, CGI, streaming fallback and mobile lifecycle.
   This prevents separate runtime layers from fighting each other.
*/
(function () {
  if (window.IndiCareRuntimeCore?.version) return;

  const body = document.body;
  const STATE_CLASSES = [
    'ic-voice-listening',
    'ic-assistant-thinking',
    'ic-assistant-speaking',
    'ic-assistant-idle',
    'ic-assistant-interrupted'
  ];

  const state = {
    version: '1.1.0',
    ready: false,
    mode: 'idle',
    listening: false,
    thinking: false,
    speaking: false,
    interrupted: false,
    chatStarted: false,
    patched: new Set(),
    observers: [],
    intervals: [],
    timeouts: [],
    controllers: [],
    lastError: null,
    stream: {
      active: false,
      controller: null,
      currentMessageNode: null,
      tokenCount: 0,
      startedAt: null,
      lastTokenAt: null
    },
    audio: {
      context: null,
      analyser: null,
      stream: null,
      raf: 0,
      level: 0,
      smoothed: 0
    }
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`indicare:runtime:${name}`, { detail: detail || snapshot() }));
  }

  function snapshot() {
    return {
      version: state.version,
      ready: state.ready,
      mode: state.mode,
      listening: state.listening,
      thinking: state.thinking,
      speaking: state.speaking,
      interrupted: state.interrupted,
      chatStarted: state.chatStarted,
      streamActive: state.stream.active,
      audioLevel: state.audio.smoothed,
      lastError: state.lastError ? String(state.lastError.message || state.lastError) : null
    };
  }

  function safe(label, fn) {
    try {
      return fn();
    } catch (error) {
      state.lastError = error;
      console.warn(`IndiCare runtime core skipped ${label}`, error);
      emit('error', { label, error: String(error?.message || error) });
      return null;
    }
  }

  function runtimeTimeout(fn, delay) {
    const id = window.setTimeout(() => {
      state.timeouts = state.timeouts.filter((item) => item !== id);
      fn();
    }, delay);
    state.timeouts.push(id);
    return id;
  }

  function setMode(mode) {
    if (!body) return;
    state.mode = mode || 'idle';
    state.listening = mode === 'listening';
    state.thinking = mode === 'thinking';
    state.speaking = mode === 'speaking';
    state.interrupted = mode === 'interrupted';
    body.classList.remove(...STATE_CLASSES);
    if (state.listening) body.classList.add('ic-voice-listening');
    else if (state.thinking) body.classList.add('ic-assistant-thinking');
    else if (state.speaking) body.classList.add('ic-assistant-speaking');
    else if (state.interrupted) body.classList.add('ic-assistant-interrupted');
    else body.classList.add('ic-assistant-idle');
    emit('state');
  }

  function markChatStarted() {
    state.chatStarted = true;
    body?.classList.add('ic-chat-started');
  }

  function clearMode(delay) {
    runtimeTimeout(() => setMode('idle'), delay || 0);
  }

  function ensureConversationExperience() {
    if (!body) return;
    body.classList.add('indicare-conversation-experience');
    if (!document.querySelector('.ic-conversation-stage')) {
      const stage = document.createElement('div');
      stage.className = 'ic-conversation-stage';
      stage.innerHTML = `
        <div class="ic-cgi-orb-wrap" aria-hidden="true">
          <div class="ic-cgi-wave"></div>
          <div class="ic-cgi-wave two"></div>
          <div class="ic-cgi-orb"><div class="ic-cgi-particles"></div></div>
          <div class="ic-cgi-caption"><strong>IndiCare Intelligence</strong><span>Conversational operational assistant active</span></div>
        </div>`;
      document.body.appendChild(stage);
    }
  }

  function interrupt(reason) {
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    if (state.stream.controller) state.stream.controller.abort(reason || 'user_interrupted');
    state.stream.active = false;
    state.stream.controller = null;
    setMode('interrupted');
    emit('interrupt', { reason: reason || 'user_interrupted' });
    clearMode(450);
  }

  function patchSpeechSynthesis() {
    if (!window.speechSynthesis || state.patched.has('speechSynthesis')) return;
    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    const originalCancel = window.speechSynthesis.cancel.bind(window.speechSynthesis);
    window.speechSynthesis.speak = function patchedSpeech(utterance) {
      setMode('speaking');
      if (utterance && !utterance.__indicareRuntimePatched) {
        utterance.__indicareRuntimePatched = true;
        utterance.addEventListener('start', () => setMode('speaking'));
        utterance.addEventListener('end', () => clearMode(500));
        utterance.addEventListener('error', () => clearMode(300));
      }
      return originalSpeak(utterance);
    };
    window.speechSynthesis.cancel = function patchedCancel() {
      setMode('interrupted');
      clearMode(350);
      return originalCancel();
    };
    state.patched.add('speechSynthesis');
  }

  function startAudioAnalysis(stream) {
    safe('audio analysis', () => {
      if (!stream || state.audio.stream === stream || !window.AudioContext && !window.webkitAudioContext) return;
      stopAudioAnalysis(false);
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextCtor();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      state.audio.context = context;
      state.audio.analyser = analyser;
      state.audio.stream = stream;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / Math.max(1, data.length);
        state.audio.level = Math.min(1, avg / 128);
        state.audio.smoothed = state.audio.smoothed * 0.78 + state.audio.level * 0.22;
        document.documentElement.style.setProperty('--ic-audio-level', state.audio.smoothed.toFixed(3));
        document.documentElement.style.setProperty('--ic-orb-scale', (1 + state.audio.smoothed * 0.09).toFixed(3));
        document.documentElement.style.setProperty('--ic-orb-glow', (0.25 + state.audio.smoothed * 0.55).toFixed(3));
        state.audio.raf = window.requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function stopAudioAnalysis(stopTracks) {
    if (state.audio.raf) cancelAnimationFrame(state.audio.raf);
    state.audio.raf = 0;
    if (stopTracks && state.audio.stream) {
      state.audio.stream.getTracks?.().forEach((track) => track.stop());
    }
    if (state.audio.context) state.audio.context.close?.().catch?.(() => null);
    state.audio.context = null;
    state.audio.analyser = null;
    state.audio.stream = null;
    state.audio.level = 0;
    state.audio.smoothed = 0;
    document.documentElement.style.setProperty('--ic-audio-level', '0');
    document.documentElement.style.setProperty('--ic-orb-scale', '1');
    document.documentElement.style.setProperty('--ic-orb-glow', '0.25');
  }

  function patchMediaDevices() {
    if (!navigator.mediaDevices?.getUserMedia || state.patched.has('getUserMedia')) return;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function patchedGetUserMedia(constraints) {
      setMode('listening');
      try {
        const stream = await original(constraints);
        startAudioAnalysis(stream);
        return stream;
      } catch (error) {
        state.lastError = error;
        clearMode(250);
        throw error;
      }
    };
    state.patched.add('getUserMedia');
  }

  function patchVoiceCompanion() {
    const companion = window.IndiCareVoiceCompanion;
    if (!companion || companion.__indicareRuntimePatched) return;
    const originalOpen = companion.open;
    if (typeof originalOpen === 'function') {
      companion.open = function runtimeOpen(...args) {
        setMode('listening');
        return safe('voice open', () => originalOpen.apply(this, args));
      };
    }
    const originalRequest = companion.request || companion.start || companion.startListening;
    if (typeof originalRequest === 'function' && !companion.request) {
      companion.request = function runtimeRequest(...args) {
        setMode('listening');
        return safe('voice request', () => originalRequest.apply(this, args));
      };
    }
    const originalStop = companion.stop || companion.stopListening;
    if (typeof originalStop === 'function' && !companion.stop) {
      companion.stop = function runtimeStop(...args) {
        stopAudioAnalysis(false);
        clearMode(0);
        return safe('voice stop', () => originalStop.apply(this, args));
      };
    }
    const originalSpeak = companion.speak;
    if (typeof originalSpeak === 'function') {
      companion.speak = async function runtimeSpeak(...args) {
        setMode('speaking');
        try { return await originalSpeak.apply(this, args); }
        finally { clearMode(700); }
      };
    }
    companion.__indicareRuntimePatched = true;
  }

  function patchDevicePermissions() {
    const permissions = window.IndiCareDevicePermissions;
    if (!permissions || permissions.__indicareRuntimePatched) return;
    const originalOpen = permissions.open;
    if (typeof originalOpen === 'function') {
      permissions.open = function runtimePermissionsOpen(...args) {
        setMode('listening');
        return safe('device permissions open', () => originalOpen.apply(this, args));
      };
    }
    const originalRequest = permissions.request;
    if (typeof originalRequest === 'function') {
      permissions.request = async function runtimePermissionsRequest(...args) {
        setMode('listening');
        return originalRequest.apply(this, args);
      };
    }
    permissions.__indicareRuntimePatched = true;
  }

  function assistantPayloadFromDom() {
    const input = document.querySelector('#input, textarea[name="message"], textarea');
    const message = String(input?.value || '').trim();
    if (!message) return null;
    const history = Array.from(document.querySelectorAll('#messages .wrap')).slice(-10).map((node) => ({
      role: node.classList.contains('assistant') ? 'assistant' : 'user',
      content: node.textContent?.trim() || ''
    })).filter((item) => item.content);
    return { message, history, response_mode: 'balanced', conversation_id: window.currentConversationId || 'assistant-ui' };
  }

  async function safeAssistantFallback(payload) {
    const response = await fetch('/assistant/general-safe', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || assistantPayloadFromDom() || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || `Assistant safe fallback failed: ${response.status}`);
    return data;
  }

  function appendAssistantFallback(answer) {
    const messages = document.querySelector('#messages, .messages');
    if (!messages || !answer) return false;
    markChatStarted();
    messages.classList.remove('hidden');
    document.querySelector('#empty')?.classList.add('hidden');
    const wrap = document.createElement('div');
    wrap.className = 'wrap assistant';
    wrap.innerHTML = `<div class="avatar">IC</div><div class="block"><div class="msg"></div></div>`;
    wrap.querySelector('.msg').textContent = answer;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return true;
  }

  function streamStart(targetNode) {
    streamCancel('new_stream');
    state.stream.active = true;
    state.stream.controller = new AbortController();
    state.stream.currentMessageNode = targetNode || null;
    state.stream.tokenCount = 0;
    state.stream.startedAt = Date.now();
    state.stream.lastTokenAt = Date.now();
    setMode('thinking');
    emit('stream:start');
    return state.stream.controller;
  }

  function streamAppend(token, targetNode) {
    const node = targetNode || state.stream.currentMessageNode;
    if (node && typeof token === 'string') node.textContent += token;
    state.stream.tokenCount += 1;
    state.stream.lastTokenAt = Date.now();
    if (state.stream.tokenCount > 1) setMode('speaking');
    emit('stream:token', { token, tokenCount: state.stream.tokenCount });
  }

  function streamFinish() {
    state.stream.active = false;
    state.stream.controller = null;
    clearMode(650);
    emit('stream:finish');
  }

  function streamCancel(reason) {
    if (state.stream.controller) state.stream.controller.abort(reason || 'cancelled');
    state.stream.active = false;
    state.stream.controller = null;
    emit('stream:cancel', { reason: reason || 'cancelled' });
  }

  function patchFetchFallback() {
    if (!window.fetch || state.patched.has('fetchFallback')) return;
    const original = window.fetch.bind(window);
    window.fetch = async function indicareRuntimeFetch(input, init) {
      const url = typeof input === 'string' ? input : input?.url || '';
      const isAssistantStream = /\/assistant\/general\/stream/.test(url);
      if (isAssistantStream) setMode('thinking');
      try {
        const response = await original(input, init);
        if (isAssistantStream && response.status >= 500) {
          const bodyText = init?.body;
          let payload = null;
          try { payload = bodyText ? JSON.parse(bodyText) : null; } catch (_) { payload = null; }
          const fallback = await safeAssistantFallback(payload);
          appendAssistantFallback(fallback.answer || fallback.response || fallback.message);
          setMode('speaking');
          clearMode(1800);
          return new Response(JSON.stringify({ ok: true, safe_mode: true, fallback_rendered: true, answer: fallback.answer }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return response;
      } catch (error) {
        if (isAssistantStream) {
          const fallback = await safeAssistantFallback(null);
          appendAssistantFallback(fallback.answer || fallback.response || fallback.message);
          setMode('speaking');
          clearMode(1800);
          return new Response(JSON.stringify({ ok: true, safe_mode: true, fallback_rendered: true, answer: fallback.answer }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    };
    state.patched.add('fetchFallback');
  }

  function bindComposerLifecycle() {
    if (state.patched.has('composerLifecycle')) return;
    document.addEventListener('click', (event) => {
      const send = event.target.closest('#send, .send-btn');
      const voice = event.target.closest('#openVoiceCompanion, #voiceOrb, .voice-trigger, .mic-btn');
      const devices = event.target.closest('#openDevicePermissions');
      const stop = event.target.closest('[data-indicare-stop], #voiceStop, .stop-generating');
      if (stop) interrupt('user_stop');
      if (send) {
        const input = document.querySelector('#input, textarea');
        if (String(input?.value || '').trim()) {
          markChatStarted();
          setMode('thinking');
          runtimeTimeout(() => {
            if (state.mode === 'thinking') setMode('speaking');
          }, 1500);
        }
      }
      if (voice || devices) setMode('listening');
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') interrupt('escape_key');
    }, true);
    document.addEventListener('input', (event) => {
      if (event.target?.matches?.('#input, textarea')) {
        if (String(event.target.value || '').trim()) markChatStarted();
      }
    }, true);
    state.patched.add('composerLifecycle');
  }

  function observeMessages() {
    if (state.patched.has('messageObserver')) return;
    const messages = document.querySelector('#messages, .messages');
    if (!messages) return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (messages.children.length) markChatStarted();
        messages.scrollTop = messages.scrollHeight;
        const latest = messages.lastElementChild;
        if (latest?.classList?.contains('assistant')) {
          setMode('speaking');
          clearMode(2200);
        }
      });
    });
    observer.observe(messages, { childList: true, subtree: true, characterData: true });
    state.observers.push(observer);
    state.patched.add('messageObserver');
  }

  function handleViewport() {
    if (state.patched.has('viewport')) return;
    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vv = window.visualViewport;
        const height = vv?.height || window.innerHeight;
        const offsetTop = vv?.offsetTop || 0;
        document.documentElement.style.setProperty('--ic-viewport-height', `${height}px`);
        document.documentElement.style.setProperty('--ic-viewport-offset-top', `${offsetTop}px`);
      });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    state.patched.add('viewport');
  }

  function bindLifecycle() {
    if (state.patched.has('lifecycle')) return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearMode(0);
        stopAudioAnalysis(false);
        streamCancel('page_hidden');
      }
    });
    window.addEventListener('beforeunload', () => cleanup());
    state.patched.add('lifecycle');
  }

  function lateBindLoop() {
    if (state.patched.has('lateBindLoop')) return;
    const id = window.setInterval(() => {
      patchVoiceCompanion();
      patchDevicePermissions();
      observeMessages();
    }, 600);
    state.intervals.push(id);
    state.patched.add('lateBindLoop');
  }

  function cleanup() {
    state.observers.forEach((observer) => observer.disconnect());
    state.intervals.forEach((id) => clearInterval(id));
    state.timeouts.forEach((id) => clearTimeout(id));
    state.controllers.forEach((controller) => controller.abort?.('cleanup'));
    state.observers = [];
    state.intervals = [];
    state.timeouts = [];
    state.controllers = [];
    streamCancel('cleanup');
    stopAudioAnalysis(false);
  }

  function init() {
    safe('experience', ensureConversationExperience);
    safe('speech synthesis', patchSpeechSynthesis);
    safe('media devices', patchMediaDevices);
    safe('voice companion', patchVoiceCompanion);
    safe('device permissions', patchDevicePermissions);
    safe('fetch fallback', patchFetchFallback);
    safe('composer lifecycle', bindComposerLifecycle);
    safe('messages', observeMessages);
    safe('viewport', handleViewport);
    safe('lifecycle', bindLifecycle);
    safe('late bind', lateBindLoop);
    state.ready = true;
    body?.classList.add('ic-runtime-core-ready');
    setMode('idle');
    emit('ready');
  }

  const core = {
    version: state.version,
    init,
    snapshot,
    setListening: () => setMode('listening'),
    setThinking: () => setMode('thinking'),
    setSpeaking: () => setMode('speaking'),
    setInterrupted: () => setMode('interrupted'),
    clearState: () => clearMode(0),
    interrupt,
    markChatStarted,
    safeAssistantFallback,
    appendAssistantFallback,
    cleanup,
    voice: {
      listen: () => setMode('listening'),
      speak: (text) => {
        if (!text || !window.SpeechSynthesisUtterance || !window.speechSynthesis) return false;
        const utterance = new SpeechSynthesisUtterance(String(text));
        utterance.lang = 'en-GB';
        utterance.rate = 0.92;
        window.speechSynthesis.speak(utterance);
        return true;
      },
      stop: () => interrupt('voice_stop')
    },
    stream: {
      start: streamStart,
      appendToken: streamAppend,
      finish: streamFinish,
      cancel: streamCancel
    }
  };

  window.IndiCareRuntimeCore = core;
  window.IndiCareConversationExperience = window.IndiCareConversationExperience || {
    setListening: core.setListening,
    setThinking: core.setThinking,
    setSpeaking: core.setSpeaking,
    clearState: core.clearState
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
