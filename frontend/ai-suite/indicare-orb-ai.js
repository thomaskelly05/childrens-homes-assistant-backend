(() => {
  const $ = (id) => document.getElementById(id);
  const clean = (value) => String(value || '').trim();

  const state = {
    recognition: null,
    listening: false,
    attachedText: '',
    conversationActive: false,
    speaking: false,
    target: 'orb',
    history: [],
    turnQueue: Promise.resolve(),
    restartTimer: null,
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
      return 'IndiCare Specialist mode. Respond calmly in British English as a highly experienced children\'s home professional using an inspection, safeguarding, chronology, evidence and leadership oversight lens. Be practical, factual, child-centred and constructively challenging. Keep the conversation flowing naturally like two adults talking, and continue until the adult says stop.';
    }
    return 'IndiCare Everyday mode. Respond calmly in British English as a practical adult colleague helping with daily work, communication, planning, reflection and records. Keep the conversation flowing naturally like two adults talking, and continue until the adult says stop.';
  }

  function output(text) {
    const box = $('icOrbOutput');
    if (box) box.textContent = text;
  }

  function appendOutput(text) {
    const box = $('icOrbOutput');
    if (!box) return;
    box.textContent = `${box.textContent || ''}\n${text}`.trim();
    box.scrollTop = box.scrollHeight;
  }

  function openOrb() {
    $('indicareOrbPanel')?.classList.add('open');
  }

  function setListening(active) {
    state.listening = active;
    $('indicareOrb')?.classList.toggle('listening', active || state.conversationActive);
  }

  function setPanelStatus(text) {
    const existing = $('icConversationStatus');
    if (existing) {
      existing.textContent = text;
      return;
    }
    const panel = $('indicareOrbPanel');
    if (!panel) return;
    const status = document.createElement('p');
    status.id = 'icConversationStatus';
    status.style.color = '#64748b';
    status.style.margin = '8px 0';
    status.textContent = text;
    panel.insertBefore(status, $('icOrbOutput'));
  }

  function speak(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(String(text || '').slice(0, 1600));
      utterance.lang = 'en-GB';
      utterance.rate = 0.94;
      utterance.pitch = 1.04;
      utterance.onstart = () => {
        state.speaking = true;
        setPanelStatus('IndiCare is speaking. You can interrupt by saying stop IndiCare or pressing Stop.');
      };
      utterance.onend = () => {
        state.speaking = false;
        resolve();
      };
      utterance.onerror = () => {
        state.speaking = false;
        resolve();
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    });
  }

  function remember(role, content) {
    state.history.push({ role, content: String(content || '').slice(0, 2000) });
    state.history = state.history.slice(-10);
  }

  async function streamAssistant(message, onToken) {
    const res = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({
        message: `${modeInstruction()}\nProject: ${projectId()}\n\n${message}`,
        response_mode: 'balanced',
        history: state.history,
        conversation_id: `orb-${projectId()}`,
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

  function shouldStop(text) {
    return /\b(stop indicare|indicare stop|stop listening|end conversation|that is all|that\'s all)\b/i.test(text || '');
  }

  async function askOrb(message) {
    const text = clean(message);
    if (!text) {
      output('Ask IndiCare something first.');
      return;
    }
    if (shouldStop(text)) {
      stopConversation();
      return;
    }
    openOrb();
    remember('user', text);
    output(`You: ${text}\n\nIndiCare is thinking...`);
    try {
      const answer = await streamAssistant(text, output);
      remember('assistant', answer);
      await speak(answer);
      if (state.conversationActive && state.target !== 'notes') {
        setPanelStatus('Listening. Carry on naturally, or say stop IndiCare.');
        restartListeningSoon();
      }
    } catch (error) {
      output(`IndiCare could not respond. ${error.message}`);
      if (state.conversationActive) restartListeningSoon();
    }
  }

  function queueOrbTurn(text) {
    state.turnQueue = state.turnQueue.then(() => askOrb(text)).catch((error) => output(`IndiCare could not continue. ${error.message}`));
  }

  function startConversation(target = 'orb') {
    state.conversationActive = true;
    state.target = target;
    openOrb();
    setPanelStatus(target === 'notes' ? 'I-Notes is listening and adding transcript.' : 'Listening. Say Hey IndiCare, speak naturally, or say stop IndiCare.');
    startSpeech(target);
  }

  function stopConversation() {
    state.conversationActive = false;
    stopSpeech();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    state.speaking = false;
    setPanelStatus('Stopped. Press Start listening when you want IndiCare again.');
    appendOutput('Conversation stopped.');
  }

  function restartListeningSoon() {
    clearTimeout(state.restartTimer);
    state.restartTimer = setTimeout(() => {
      if (state.conversationActive && !state.speaking && !state.listening) startSpeech(state.target);
    }, 650);
  }

  function startSpeech(target = 'orb') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      output('Speech recognition is not supported in this browser. You can still type to IndiCare.');
      return;
    }
    stopSpeech(false);
    const recognition = new SpeechRecognition();
    state.recognition = recognition;
    state.target = target;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (state.conversationActive && !state.speaking) restartListeningSoon();
    };
    recognition.onerror = () => {
      setListening(false);
      if (state.conversationActive && !state.speaking) restartListeningSoon();
    };
    recognition.onresult = (event) => {
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = clean(event.results[index][0].transcript);
        if (/hey indicare/i.test(text)) {
          openOrb();
          state.conversationActive = true;
        }
        if (event.results[index].isFinal) finalText += `${text} `;
      }
      finalText = clean(finalText.replace(/hey indicare/ig, ''));
      if (!finalText) return;
      if (shouldStop(finalText)) {
        stopConversation();
        return;
      }
      if (target === 'notes' && $('transcript')) {
        $('transcript').innerText += `\n${finalText}`;
      } else {
        queueOrbTurn(finalText);
      }
    };
    try {
      recognition.start();
    } catch (_) {
      restartListeningSoon();
    }
  }

  function stopSpeech(stopConversationFlag = true) {
    clearTimeout(state.restartTimer);
    try { state.recognition?.stop(); } catch (_) {}
    state.recognition = null;
    setListening(false);
    if (stopConversationFlag) state.conversationActive = false;
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
        queueOrbTurn(source?.value || 'Hello IndiCare');
      });
    }
    const listen = $('icListen');
    if (listen && !listen.dataset.orbAiWired) {
      listen.dataset.orbAiWired = '1';
      listen.addEventListener('click', () => startConversation('orb'));
    }
    const stop = $('icStop');
    if (stop && !stop.dataset.orbAiWired) {
      stop.dataset.orbAiWired = '1';
      stop.addEventListener('click', stopConversation);
    }
    const mic = $('micBtn');
    if (mic && !mic.dataset.orbAiWired) {
      mic.dataset.orbAiWired = '1';
      mic.addEventListener('click', () => startConversation('orb'));
    }
    const startRecording = $('startRecording');
    if (startRecording && !startRecording.dataset.orbAiWired) {
      startRecording.dataset.orbAiWired = '1';
      startRecording.addEventListener('click', () => startConversation('notes'));
    }
    const stopRecording = $('stopRecording');
    if (stopRecording && !stopRecording.dataset.orbAiWired) {
      stopRecording.dataset.orbAiWired = '1';
      stopRecording.addEventListener('click', stopConversation);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 500);
  window.IndiCareOrbAI = { askOrb, startSpeech, stopSpeech, startConversation, stopConversation, streamAssistant };
})();
