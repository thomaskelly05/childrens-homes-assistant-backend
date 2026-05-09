/* IndiCare Alive Voice Layer
   Final immersion layer for the standalone IndiCare AI assistant.
   Adds interruption, paced speech, calm acknowledgements and a more continuous flow
   on top of the existing voice companion and I-Notes transcription bridge.
*/
(function () {
  const ENABLED_KEY = "indicare_alive_voice_enabled";
  const PACE_KEY = "indicare_alive_voice_pace";

  const state = {
    enabled: localStorage.getItem(ENABLED_KEY) !== "false",
    speaking: false,
    queue: [],
    current: null,
    pace: localStorage.getItem(PACE_KEY) || "calm",
    lastSpoken: "",
    interruptionArmed: false,
  };

  const $ = (id) => document.getElementById(id);

  function supportsSpeech() {
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/```[\s\S]*?```/g, "I’ve put the detailed content on screen for you.")
      .replace(/\[[^\]]+\]\([^\)]+\)/g, "")
      .replace(/[#*_>`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitIntoSpeechTurns(text) {
    const clean = cleanText(text);
    if (!clean) return [];
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    const chunks = [];
    let buffer = "";
    sentences.forEach((sentence) => {
      const next = `${buffer} ${sentence}`.trim();
      if (next.length > 260 && buffer) {
        chunks.push(buffer.trim());
        buffer = sentence.trim();
      } else {
        buffer = next;
      }
    });
    if (buffer) chunks.push(buffer.trim());
    return chunks.slice(0, 8);
  }

  function voiceParams() {
    if (state.pace === "faster") return { rate: 1.02, pitch: 1.0 };
    if (state.pace === "slow") return { rate: 0.84, pitch: 1.0 };
    return { rate: 0.91, pitch: 1.02 };
  }

  function preferredVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const saved = localStorage.getItem("indicare_voice_companion_voice_name");
    const hints = ["serena", "susan", "kate", "libby", "sonia", "female", "uk", "british"];
    return voices.find((voice) => saved && voice.name === saved)
      || voices.find((voice) => /en[-_]gb/i.test(voice.lang) && hints.some((hint) => voice.name.toLowerCase().includes(hint)))
      || voices.find((voice) => /en[-_]gb/i.test(voice.lang))
      || voices[0]
      || null;
  }

  function setStatus(text) {
    const node = $("voiceStatus");
    if (node) node.textContent = text;
  }

  function cancelSpeech(reason) {
    if (!supportsSpeech()) return;
    window.speechSynthesis.cancel();
    state.queue = [];
    state.speaking = false;
    state.current = null;
    document.body.classList.remove("ic-alive-speaking");
    if (reason) setStatus(reason);
  }

  function speakChunk(chunk, index) {
    if (!supportsSpeech() || !state.enabled || !chunk) return;
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = "en-GB";
    const params = voiceParams();
    utterance.rate = params.rate;
    utterance.pitch = params.pitch;
    utterance.volume = 1;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      state.speaking = true;
      state.current = utterance;
      document.body.classList.add("ic-alive-speaking");
      setStatus(index === 0 ? "I’m talking it through with you." : "I’m continuing.");
    };
    utterance.onend = () => {
      state.speaking = false;
      state.current = null;
      window.setTimeout(playNext, state.pace === "slow" ? 520 : 280);
    };
    utterance.onerror = () => {
      state.speaking = false;
      state.current = null;
      playNext();
    };
    window.speechSynthesis.speak(utterance);
  }

  function playNext() {
    if (!state.enabled || !state.queue.length) {
      state.speaking = false;
      document.body.classList.remove("ic-alive-speaking");
      setStatus("Ready when you are.");
      return;
    }
    const next = state.queue.shift();
    speakChunk(next.text, next.index);
  }

  function speakPaced(text) {
    if (!supportsSpeech() || !state.enabled) return;
    const chunks = splitIntoSpeechTurns(text);
    if (!chunks.length) return;
    cancelSpeech();
    state.lastSpoken = cleanText(text);
    state.queue = chunks.map((chunk, index) => ({ text: chunk, index }));
    playNext();
  }

  function acknowledge(kind) {
    if (!supportsSpeech() || !state.enabled) return;
    const lines = {
      listening: "I’m listening.",
      thinking: "Okay. Let me think that through with the wider context.",
      interrupted: "Of course. I’ll stop there.",
      safeguarding: "Okay. Let’s slow this down and look at it carefully.",
      handover: "Right. Let’s make this useful for handover.",
    };
    const text = lines[kind] || "Okay.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.9;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function installControls() {
    const actions = document.querySelector(".ic-voice-actions");
    if (!actions || $("aliveVoiceToggle")) return;
    const interrupt = document.createElement("button");
    interrupt.id = "aliveVoiceInterrupt";
    interrupt.type = "button";
    interrupt.textContent = "Interrupt";
    interrupt.title = "Stop IndiCare speaking so you can correct or continue";
    interrupt.addEventListener("click", () => {
      cancelSpeech("Stopped. Tell me what changed.");
      acknowledge("interrupted");
    });

    const toggle = document.createElement("button");
    toggle.id = "aliveVoiceToggle";
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      state.enabled = !state.enabled;
      localStorage.setItem(ENABLED_KEY, state.enabled ? "true" : "false");
      renderControls();
    });

    const pace = document.createElement("button");
    pace.id = "aliveVoicePace";
    pace.type = "button";
    pace.title = "Change speaking pace";
    pace.addEventListener("click", () => {
      state.pace = state.pace === "calm" ? "slow" : state.pace === "slow" ? "faster" : "calm";
      localStorage.setItem(PACE_KEY, state.pace);
      renderControls();
      acknowledge("listening");
    });

    actions.appendChild(interrupt);
    actions.appendChild(toggle);
    actions.appendChild(pace);
    renderControls();
  }

  function renderControls() {
    const toggle = $("aliveVoiceToggle");
    const pace = $("aliveVoicePace");
    if (toggle) {
      toggle.textContent = state.enabled ? "Alive voice on" : "Alive voice off";
      toggle.classList.toggle("active", state.enabled);
    }
    if (pace) pace.textContent = `Pace: ${state.pace}`;
  }

  function plainTextFromHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  }

  function latestAssistantText() {
    const messages = [...document.querySelectorAll("#messages .wrap.assistant .msg")];
    const latest = messages[messages.length - 1];
    return latest ? plainTextFromHtml(latest.innerHTML).trim() : "";
  }

  function observeReplies() {
    const messages = $("messages");
    if (!messages || window.__indicareAliveObserver) return;
    window.__indicareAliveObserver = new MutationObserver(() => {
      const latest = latestAssistantText();
      if (!latest || latest === state.lastSpoken) return;
      const pending = document.querySelector("#messages .wrap.assistant:last-child .meta");
      if (pending) return;
      // Let the original voice companion update first, then take over with paced speech.
      window.setTimeout(() => speakPaced(latest), 250);
    });
    window.__indicareAliveObserver.observe(messages, { childList: true, subtree: true, characterData: true });
  }

  function patchInputEvents() {
    const send = $("send");
    if (!send || send.dataset.aliveVoicePatched === "true") return;
    send.dataset.aliveVoicePatched = "true";
    send.addEventListener("click", () => {
      const text = cleanText($("input")?.value || "").toLowerCase();
      if (/safeguarding|disclosure|allegation|missing|restraint|physical intervention|police|risk/.test(text)) acknowledge("safeguarding");
      else if (/handover|shift|tonight|today|morning|evening/.test(text)) acknowledge("handover");
      else acknowledge("thinking");
    }, true);
  }

  function installStyles() {
    if ($("indicareAliveVoiceStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareAliveVoiceStyles";
    style.textContent = `
      #aliveVoiceToggle.active{background:#ecfdf5;border-color:#a7f3d0;color:#047857}
      #aliveVoiceInterrupt{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .ic-alive-speaking #voiceOrb{box-shadow:0 0 0 8px rgba(16,163,127,.12),0 20px 60px rgba(16,163,127,.34)}
    `;
    document.head.appendChild(style);
  }

  window.IndiCareAliveVoice = {
    speak: speakPaced,
    stop: cancelSpeech,
    acknowledge,
    enabled: () => state.enabled,
  };

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    const timer = setInterval(() => {
      installControls();
      patchInputEvents();
      observeReplies();
      if ($("aliveVoiceToggle")) clearInterval(timer);
    }, 500);
  });
})();
