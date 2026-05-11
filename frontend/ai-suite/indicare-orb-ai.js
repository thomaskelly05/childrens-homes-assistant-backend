(() => {
  const $ = (id) => document.getElementById(id);
  const clean = (value) => String(value || '').trim();

  const state = {
    recognition: null,
    listening: false,
    attachedText: '',
  };

  function cookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function headers() {
    const csrf = cookie('__Host-indicare_csrf') || cookie('indicare_csrf');
    const out = { 'Content-Type': 'application/json' };
    if (csrf) out['X-CSRF-Token'] = csrf;
    return out;
  }

  function projectId() {
    return localStorage.getItem('ic_active_project') || 'general';
  }

  function orbMode() {
    return localStorage.getItem('ic_orb_mode') || 'everyday';
  }

  function modeInstruction() {
    if (orbMode() === 'specialist') {
      return 'IndiCare Specialist mode. Respond calmly in British English as a highly experienced children\'s home professional using an inspection, safeguarding, chronology, evidence and leadership oversight lens. Be practical, factual, child-centred and constructively challenging.';
    }
    return 'IndiCare Everyday mode. Respond calmly in British English as a practical adult colleague helping with daily work, communication, planning, reflection and records.';
  }

  function output(text) {
    const box = $('icOrbOutput');
    if (box) box.textContent = text;
  }

  function openOrb() {
    $('indicareOrbPanel')?.classList.add('open');
  }

  function setListening(active) {
    state.listening = active;
    $('indicareOrb')?.classList.toggle('listening', active);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(String(text || '').slice(0, 1200));
    utterance.lang = 'en-GB';
    utterance.rate = 0.94;
    utterance.pitch = 1.04;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  async function streamAssistant(message, onToken) {
    const res = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({
        message: `${modeInstruction()}\nProject: ${projectId()}\n\n${message}`,
        response_mode: 'balanced',
        history: [],
        conversation_id: `orb-${projectId()}-${Date.now()}`,
        assistant_surface: 'ai-suite',
        assistant_mode: orbMode() === 'specialist' ? 'intelligence' : 'assistant',
        project_id: projectId(),
        document_text: state.attachedText || null,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`AI request failed ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        if (chunk.startsWith('event:')) continue;
        chunk.split('\n').forEach((line) => {
          if (!line.startsWith('data:')) return;
          const token = line.slice(5).trimStart();
          if (!token || token === '[DONE]') return;
          answer += `${token}\n`;
          onToken(answer);
        });
      }
    }
    return answer;
  }

  async function askOrb(message) {
    const text = clean(message);
    if (!text) {
      output('Ask IndiCare something first.');
      return;
    }
    openOrb();
    output(`You: ${text}\n\nIndiCare is thinking...`);
    try {
      const answer = await streamAssistant(text, output);
      speak(answer);
    } catch (error) {
      output(`IndiCare could not respond. ${error.message}`);
    }
  }

  function startSpeech(target = 'orb') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      output('Speech recognition is not supported in this browser. You can still type to IndiCare.');
      return;
    }
    stopSpeech();
    const recognition = new SpeechRecognition();
    state.recognition = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = clean(event.results[index][0].transcript);
        if (/hey indicare/i.test(text)) openOrb();
        if (event.results[index].isFinal) finalText += `${text} `;
      }
      finalText = clean(finalText.replace(/hey indicare/ig, ''));
      if (!finalText) return;
      if (target === 'notes' && $('transcript')) {
        $('transcript').innerText += `\n${finalText}`;
      } else {
        askOrb(finalText);
      }
    };
    recognition.start();
  }

  function stopSpeech() {
    try { state.recognition?.stop(); } catch (_) {}
    state.recognition = null;
    setListening(false);
  }

  function wireFileInput() {
    const input = $('fileInput');
    if (!input || input.dataset.orbAiWired) return;
    input.dataset.orbAiWired = '1';
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.type && file.type.startsWith('audio/') && $('transcript')) return;
      try {
        state.attachedText = await file.text();
        output(`Attached ${file.name} to IndiCare context.`);
      } catch (_) {}
    });
  }

  function wire() {
    wireFileInput();
    const askButton = $('icAsk');
    if (askButton && !askButton.dataset.orbAiWired) {
      askButton.dataset.orbAiWired = '1';
      askButton.addEventListener('click', () => {
        const source = $('input') || $('intelInput') || $('connectInput');
        askOrb(source?.value || 'Hello IndiCare');
      });
    }
    const listen = $('icListen');
    if (listen && !listen.dataset.orbAiWired) {
      listen.dataset.orbAiWired = '1';
      listen.addEventListener('click', () => startSpeech('orb'));
    }
    const stop = $('icStop');
    if (stop && !stop.dataset.orbAiWired) {
      stop.dataset.orbAiWired = '1';
      stop.addEventListener('click', stopSpeech);
    }
    const mic = $('micBtn');
    if (mic && !mic.dataset.orbAiWired) {
      mic.dataset.orbAiWired = '1';
      mic.addEventListener('click', () => startSpeech('orb'));
    }
    const startRecording = $('startRecording');
    if (startRecording && !startRecording.dataset.orbAiWired) {
      startRecording.dataset.orbAiWired = '1';
      startRecording.addEventListener('click', () => startSpeech('notes'));
    }
    const stopRecording = $('stopRecording');
    if (stopRecording && !stopRecording.dataset.orbAiWired) {
      stopRecording.dataset.orbAiWired = '1';
      stopRecording.addEventListener('click', stopSpeech);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 500);
  window.IndiCareOrbAI = { askOrb, startSpeech, stopSpeech, streamAssistant };
})();
