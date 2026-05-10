/* IndiCare Voice Companion
   A lightweight voice layer for the standalone IndiCare AI tools shell.
   It reuses the existing assistant wiring by placing recognised speech into #input and clicking #send.
*/
(function () {
  const VOICE_ENABLED_KEY = "indicare_voice_companion_enabled";
  const VOICE_NAME_KEY = "indicare_voice_companion_voice_name";
  const LAST_SPOKEN_KEY = "indicare_voice_companion_last_spoken_message";

  const $ = (id) => document.getElementById(id);

  const state = {
    recognition: null,
    listening: false,
    speaking: false,
    enabled: localStorage.getItem(VOICE_ENABLED_KEY) === "true",
    transcript: "",
    voices: [],
    preferredVoice: null,
    lastAssistantText: "",
    observer: null,
  };

  function loadCss() {
    if (document.querySelector('link[data-indicare-voice-css="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/indicare-voice-companion.css";
    link.dataset.indicareVoiceCss = "true";
    document.head.appendChild(link);
  }

  function supportsSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function supportsSpeechSynthesis() {
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function toast(text) {
    const existing = document.querySelector(".ic-bridge-toast, .ic-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "ic-bridge-toast";
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2400);
  }

  function installUi() {
    if ($("indicareVoiceCompanion")) return;
    const shell = document.createElement("section");
    shell.id = "indicareVoiceCompanion";
    shell.className = "ic-voice-companion";
    shell.innerHTML = `
      <button id="voiceOrb" class="ic-voice-orb" type="button" aria-label="Talk to IndiCare AI" title="Talk to IndiCare AI">
        <span class="ic-voice-orb-core">AI</span>
        <span class="ic-voice-ripple"></span>
      </button>
      <div id="voicePanel" class="ic-voice-panel hidden">
        <div class="ic-voice-panel-head">
          <div>
            <strong>IndiCare Voice</strong>
            <span id="voiceStatus">Ready when you are.</span>
          </div>
          <button id="voicePanelClose" type="button" aria-label="Close voice panel">×</button>
        </div>
        <div id="voiceTranscript" class="ic-voice-transcript">Tap the orb and speak naturally.</div>
        <div class="ic-voice-actions">
          <button id="voiceStart" type="button">Start listening</button>
          <button id="voiceStop" type="button">Stop</button>
          <button id="voiceSpeakLast" type="button">Read last reply</button>
          <button id="voiceSettings" type="button">Voice</button>
        </div>
        <div id="voiceSettingsPanel" class="ic-voice-settings hidden">
          <label>Preferred voice
            <select id="voiceSelect"></select>
          </label>
          <p>IndiCare will prefer a calm British female voice where the browser provides one.</p>
        </div>
      </div>
    `;
    document.body.appendChild(shell);
  }

  function setStatus(text) {
    const node = $("voiceStatus");
    if (node) node.textContent = text;
  }

  function setTranscript(text) {
    const node = $("voiceTranscript");
    if (node) node.textContent = text || "Listening...";
  }

  function setStateClass(name, active) {
    $("indicareVoiceCompanion")?.classList.toggle(name, !!active);
  }

  function openPanel() {
    $("voicePanel")?.classList.remove("hidden");
  }

  function closePanel() {
    $("voicePanel")?.classList.add("hidden");
  }

  function loadVoices() {
    if (!supportsSpeechSynthesis()) return;
    state.voices = window.speechSynthesis.getVoices() || [];
    const saved = localStorage.getItem(VOICE_NAME_KEY);
    const britishFemaleHints = ["serena", "susan", "kate", "moira", "libby", "sonia", "female", "uk", "british", "english united kingdom"];
    state.preferredVoice = state.voices.find((voice) => saved && voice.name === saved)
      || state.voices.find((voice) => /en[-_]gb/i.test(voice.lang) && britishFemaleHints.some((hint) => voice.name.toLowerCase().includes(hint)))
      || state.voices.find((voice) => /en[-_]gb/i.test(voice.lang))
      || state.voices.find((voice) => /english/i.test(voice.name))
      || state.voices[0]
      || null;
    renderVoiceSelect();
  }

  function renderVoiceSelect() {
    const select = $("voiceSelect");
    if (!select) return;
    if (!state.voices.length) {
      select.innerHTML = '<option value="">Browser voice unavailable</option>';
      return;
    }
    select.innerHTML = state.voices.map((voice) => `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`).join("");
    if (state.preferredVoice) select.value = state.preferredVoice.name;
  }

  function createRecognition() {
    if (!supportsSpeechRecognition()) return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      state.transcript = "";
      openPanel();
      setStateClass("listening", true);
      setStatus("I’m listening. Speak naturally.");
      setTranscript("Listening...");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += text;
        else interim += text;
      }
      state.transcript = `${state.transcript} ${finalText}`.trim();
      setTranscript([state.transcript, interim].filter(Boolean).join(" ").trim());
    };

    recognition.onerror = (event) => {
      state.listening = false;
      setStateClass("listening", false);
      setStatus(event.error === "not-allowed" ? "Microphone permission is blocked." : "I couldn’t hear that clearly.");
    };

    recognition.onend = () => {
      state.listening = false;
      setStateClass("listening", false);
      const text = state.transcript.trim();
      if (!text) {
        setStatus("Ready when you are.");
        return;
      }
      handleVoiceText(text);
    };

    return recognition;
  }

  function startListening() {
    if (!supportsSpeechRecognition()) {
      openPanel();
      setStatus("Voice recognition is not available in this browser.");
      setTranscript("Try Chrome or Edge for browser voice recognition.");
      return;
    }
    if (state.speaking && supportsSpeechSynthesis()) window.speechSynthesis.cancel();
    if (!state.recognition) state.recognition = createRecognition();
    try {
      state.recognition.start();
    } catch (_) {
      setStatus("I’m already listening.");
    }
  }

  function stopListening() {
    if (state.recognition && state.listening) state.recognition.stop();
    if (state.speaking && supportsSpeechSynthesis()) window.speechSynthesis.cancel();
    state.listening = false;
    state.speaking = false;
    setStateClass("listening", false);
    setStateClass("speaking", false);
    setStatus("Stopped.");
  }

  function warmPrompt(text) {
    const lower = text.toLowerCase();
    const prefix = "Please respond conversationally as IndiCare AI: calm, warm, British, professionally grounded, reflective, and like an experienced residential children's home manager or supportive colleague. Avoid blunt bullet-only responses unless I ask for a list. Acknowledge the situation first, then guide me clearly. ";

    if (/incident|restraint|physical intervention|missing|police|safeguarding|disclosure|risk/.test(lower)) {
      return `${prefix}I have spoken this to you. Help me work through it carefully, separating facts, feelings, safeguarding considerations, missing information and next actions. My spoken request was: ${text}`;
    }
    if (/note|notes|meeting|handover|supervision|transcript/.test(lower)) {
      return `${prefix}Help me turn this into clear professional notes. Start by reassuring me and then structure what we know. My spoken request was: ${text}`;
    }
    if (/email|mail|send|reply/.test(lower)) {
      return `${prefix}Help me communicate this professionally and calmly. My spoken request was: ${text}`;
    }
    if (/document|docs|template|reg 45|regulation 45|ofsted/.test(lower)) {
      return `${prefix}Help me create or improve this document in a professional, inspection-aware way. My spoken request was: ${text}`;
    }
    return `${prefix}Have a natural conversation with me and help me think this through. My spoken request was: ${text}`;
  }

  function routeCommand(text) {
    const lower = text.toLowerCase().trim();
    if (/^(open|go to|show).*(i[- ]?notes|notes)/.test(lower)) {
      document.querySelector('[data-suite-view="notes"]')?.click();
      setStatus("I’ve opened I-Notes.");
      speak("I’ve opened I-Notes. Tell me what you’d like to capture.");
      return true;
    }
    if (/^(open|go to|show).*(docs|documents)/.test(lower)) {
      document.querySelector('[data-suite-view="docs"]')?.click();
      setStatus("I’ve opened IndiCare Docs.");
      speak("I’ve opened IndiCare Docs. We can build the document together.");
      return true;
    }
    if (/^(open|go to|show).*(mail|email)/.test(lower)) {
      document.querySelector('[data-suite-view="mail"]')?.click();
      setStatus("I’ve opened IndiCare Mail.");
      speak("I’ve opened IndiCare Mail. I can help you draft the message calmly and professionally.");
      return true;
    }
    if (/^(new chat|start again|new conversation)/.test(lower)) {
      $("newChat")?.click();
      setStatus("Started a new conversation.");
      speak("Of course. I’ve started a fresh conversation for you.");
      return true;
    }
    if (/^(read|say).*(last|reply|response)/.test(lower)) {
      speakLastReply();
      return true;
    }
    return false;
  }

  function submitToAssistant(text) {
    document.querySelector('[data-suite-view="intelligence"]')?.click();
    const input = $("input");
    const send = $("send");
    if (!input || !send) {
      setStatus("I couldn’t find the assistant input.");
      return;
    }
    input.value = warmPrompt(text);
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setStatus("I’m thinking this through with you.");
    send.click();
  }

  function handleVoiceText(text) {
    openPanel();
    setTranscript(text);
    setStatus("I heard you. Let me help with that.");
    if (routeCommand(text)) return;
    submitToAssistant(text);
  }

  function plainTextFromHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  }

  function latestAssistantMessageText() {
    const messages = [...document.querySelectorAll("#messages .wrap.assistant .msg")];
    const latest = messages[messages.length - 1];
    return latest ? plainTextFromHtml(latest.innerHTML).trim() : "";
  }

  function shortenForSpeech(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= 900) return clean;
    const sentenceCut = clean.slice(0, 900).replace(/\s+[^\s]*$/, "");
    return `${sentenceCut}. I’ve put the full detail on screen for you.`;
  }

  function speak(text) {
    if (!supportsSpeechSynthesis()) return;
    const clean = shortenForSpeech(text);
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-GB";
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    if (state.preferredVoice) utterance.voice = state.preferredVoice;
    utterance.onstart = () => {
      state.speaking = true;
      openPanel();
      setStateClass("speaking", true);
      setStatus("I’m speaking.");
    };
    utterance.onend = () => {
      state.speaking = false;
      setStateClass("speaking", false);
      setStatus("Ready when you are.");
    };
    utterance.onerror = () => {
      state.speaking = false;
      setStateClass("speaking", false);
      setStatus("I couldn’t read that aloud.");
    };
    window.speechSynthesis.speak(utterance);
  }

  function speakLastReply() {
    const text = latestAssistantMessageText() || state.lastAssistantText || localStorage.getItem(LAST_SPOKEN_KEY) || "";
    if (!text) {
      setStatus("There is no reply to read yet.");
      return;
    }
    speak(text);
  }

  function observeAssistantReplies() {
    const messages = $("messages");
    if (!messages || state.observer) return;
    state.observer = new MutationObserver(() => {
      const latest = latestAssistantMessageText();
      if (!latest || latest === state.lastAssistantText) return;
      const pending = document.querySelector("#messages .wrap.assistant:last-child .meta");
      if (pending) return;
      state.lastAssistantText = latest;
      localStorage.setItem(LAST_SPOKEN_KEY, latest);
      if (state.enabled) speak(latest);
    });
    state.observer.observe(messages, { childList: true, subtree: true, characterData: true });
  }

  function bind() {
    $("voiceOrb")?.addEventListener("click", () => {
      openPanel();
      if (state.listening || state.speaking) stopListening();
      else startListening();
    });
    $("voiceStart")?.addEventListener("click", startListening);
    $("voiceStop")?.addEventListener("click", stopListening);
    $("voiceSpeakLast")?.addEventListener("click", speakLastReply);
    $("voicePanelClose")?.addEventListener("click", closePanel);
    $("voiceSettings")?.addEventListener("click", () => $("voiceSettingsPanel")?.classList.toggle("hidden"));
    $("voiceSelect")?.addEventListener("change", (event) => {
      const selected = state.voices.find((voice) => voice.name === event.target.value);
      state.preferredVoice = selected || state.preferredVoice;
      if (selected) localStorage.setItem(VOICE_NAME_KEY, selected.name);
      speak("This is the voice I’ll use where your browser allows it.");
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        openPanel();
        startListening();
      }
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    loadCss();
    installUi();
    bind();
    loadVoices();
    if (supportsSpeechSynthesis()) window.speechSynthesis.onvoiceschanged = loadVoices;
    observeAssistantReplies();
    setStatus(supportsSpeechRecognition() ? "Ready when you are." : "Voice recognition is limited in this browser.");
  });
})();
