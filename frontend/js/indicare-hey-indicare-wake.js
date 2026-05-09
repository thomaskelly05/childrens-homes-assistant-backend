/* Hey IndiCare wake phrase layer
   Browser-based wake behaviour: after the user enables voice/microphone access,
   this listens for "Hey IndiCare" and sends the rest of the phrase into the existing assistant flow.
*/
(function () {
  const WAKE_ENABLED_KEY = "indicare_hey_indicare_enabled";
  const $ = (id) => document.getElementById(id);

  const state = {
    recognition: null,
    enabled: localStorage.getItem(WAKE_ENABLED_KEY) === "true",
    listening: false,
  };

  function supportsSpeechRecognition() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function toast(text) {
    const existing = document.querySelector(".ic-bridge-toast, .ic-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "ic-bridge-toast";
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2600);
  }

  function setVoiceStatus(text) {
    const status = $("voiceStatus");
    if (status) status.textContent = text;
  }

  function setVoiceTranscript(text) {
    const transcript = $("voiceTranscript");
    if (transcript) transcript.textContent = text;
  }

  function openVoicePanel() {
    $("voicePanel")?.classList.remove("hidden");
  }

  function warmPrompt(text) {
    return [
      "Please respond conversationally as IndiCare AI: calm, warm, British, professionally grounded, reflective, and like an experienced residential children's home manager or supportive colleague.",
      "This was spoken after the wake phrase 'Hey IndiCare'. Keep the conversation flowing naturally and do not end abruptly.",
      "Spoken request:",
      text,
    ].join("\n");
  }

  function sendToAssistant(text) {
    const input = $("input");
    const send = $("send");
    document.querySelector('[data-suite-view="intelligence"]')?.click();
    if (!input || !send) {
      toast("I could not find the assistant input.");
      return;
    }
    input.value = warmPrompt(text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    send.click();
  }

  function routeCommand(text) {
    const lower = text.toLowerCase().trim();
    if (/^(open|show|go to)\s+(notes|i notes|i-notes)$/.test(lower)) {
      document.querySelector('[data-suite-view="notes"]')?.click();
      setVoiceStatus("I’ve opened I-Notes.");
      return true;
    }
    if (/^(open|show|go to)\s+(docs|documents|indicare docs)$/.test(lower)) {
      document.querySelector('[data-suite-view="docs"]')?.click();
      setVoiceStatus("I’ve opened IndiCare Docs.");
      return true;
    }
    if (/^(open|show|go to)\s+(mail|email|indicare mail)$/.test(lower)) {
      document.querySelector('[data-suite-view="mail"]')?.click();
      setVoiceStatus("I’ve opened IndiCare Mail.");
      return true;
    }
    return false;
  }

  function extractWakeCommand(transcript) {
    const text = String(transcript || "").trim();
    const match = text.match(/(?:^|\b)(hey\s+indicare|hi\s+indicare|okay\s+indicare|ok\s+indicare)\b[,.\s]*(.*)$/i);
    if (!match) return null;
    return (match[2] || "").trim() || "How can you help me?";
  }

  function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      document.body.classList.add("ic-hey-indicare-active");
      setVoiceStatus("Say “Hey IndiCare” when you need me.");
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        const command = extractWakeCommand(transcript);
        if (!command) continue;
        openVoicePanel();
        setVoiceTranscript(`Hey IndiCare, ${command}`);
        setVoiceStatus("I heard you. I’m with you.");
        if (!routeCommand(command)) sendToAssistant(command);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        state.enabled = false;
        localStorage.setItem(WAKE_ENABLED_KEY, "false");
        setVoiceStatus("Microphone permission is blocked.");
        document.body.classList.remove("ic-hey-indicare-active");
        return;
      }
      setVoiceStatus("Hey IndiCare is still available — tap Voice if I miss you.");
    };

    recognition.onend = () => {
      state.listening = false;
      document.body.classList.remove("ic-hey-indicare-active");
      if (state.enabled) {
        window.setTimeout(startWakeListening, 600);
      }
    };

    return recognition;
  }

  function startWakeListening() {
    if (!supportsSpeechRecognition()) {
      setVoiceStatus("Hey IndiCare needs Chrome or Edge voice support.");
      return;
    }
    if (!state.recognition) state.recognition = createRecognition();
    try {
      state.recognition.start();
    } catch (_) {
      // Recognition is already running.
    }
  }

  function stopWakeListening() {
    state.enabled = false;
    localStorage.setItem(WAKE_ENABLED_KEY, "false");
    try { state.recognition?.stop(); } catch (_) {}
    document.body.classList.remove("ic-hey-indicare-active");
    setVoiceStatus("Hey IndiCare is off.");
  }

  function toggleWakeListening() {
    state.enabled = !state.enabled;
    localStorage.setItem(WAKE_ENABLED_KEY, state.enabled ? "true" : "false");
    openVoicePanel();
    if (state.enabled) {
      toast("Hey IndiCare enabled");
      setVoiceTranscript("Say “Hey IndiCare…” followed by what you need.");
      startWakeListening();
    } else {
      toast("Hey IndiCare disabled");
      stopWakeListening();
    }
    renderWakeButton();
  }

  function renderWakeButton() {
    const actions = document.querySelector(".ic-voice-actions");
    if (!actions) return;
    let button = $("heyIndicareToggle");
    if (!button) {
      button = document.createElement("button");
      button.id = "heyIndicareToggle";
      button.type = "button";
      button.addEventListener("click", toggleWakeListening);
      actions.prepend(button);
    }
    button.textContent = state.enabled ? "Hey IndiCare: On" : "Hey IndiCare: Off";
    button.classList.toggle("active", state.enabled);
  }

  function patchVoiceCopy() {
    const transcript = $("voiceTranscript");
    if (transcript && /Tap the orb/i.test(transcript.textContent || "")) {
      transcript.textContent = "Tap the orb, or enable “Hey IndiCare” and speak naturally.";
    }
    const voiceButton = $("openVoiceCompanion");
    if (voiceButton) {
      voiceButton.textContent = "Hey IndiCare";
      voiceButton.title = "Enable or use Hey IndiCare voice mode";
    }
    const orb = $("voiceOrb");
    if (orb) {
      orb.title = "Say Hey IndiCare or tap to talk";
      orb.setAttribute("aria-label", "Hey IndiCare voice assistant");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => {
      patchVoiceCopy();
      renderWakeButton();
      if (state.enabled) startWakeListening();
    }, 700);
  });
})();
