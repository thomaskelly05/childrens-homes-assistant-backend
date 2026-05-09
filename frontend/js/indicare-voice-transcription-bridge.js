/* IndiCare Voice Transcription Bridge
   Reuses existing I-Notes /ai-notes/transcribe endpoint as a stronger audio fallback
   when browser SpeechRecognition is unavailable or unreliable.
*/
(function () {
  const $ = (id) => document.getElementById(id);

  const state = {
    stream: null,
    recorder: null,
    chunks: [],
    recording: false,
  };

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function csrfHeaders(method, headers) {
    const next = { ...(headers || {}) };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) {
      const token = csrfToken();
      if (token) next["X-CSRF-Token"] = token;
    }
    return next;
  }

  function setStatus(text) {
    const node = $("voiceStatus");
    if (node) node.textContent = text;
  }

  function setTranscript(text) {
    const node = $("voiceTranscript");
    if (node) node.textContent = text;
  }

  function openVoicePanel() {
    $("voicePanel")?.classList.remove("hidden");
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

  function assistantModeInstruction() {
    const mode = window.IndiCareAssistantMode?.current?.() || localStorage.getItem("indicare_ai_assistant_mode") || "children_home_specialist";
    if (mode === "general") {
      return "INDICARE MODE: GENERAL ASSISTANT. Respond naturally and helpfully as a broad everyday AI assistant. Do not force children’s home, Ofsted or safeguarding framing unless I ask for it.";
    }
    return "INDICARE MODE: CHILDREN'S HOME SPECIALIST ASSISTANT. Respond as an advanced Ofsted-grade residential childcare practitioner intelligence: evidence-led, safeguarding-aware, calm, analytical, child-centred and professionally rigorous. Do not claim to be an actual Ofsted inspector or make final legal/safeguarding decisions.";
  }

  function warmPrompt(text) {
    return [
      assistantModeInstruction(),
      "This was captured through the Hey IndiCare voice transcription bridge using I-Notes transcription.",
      "Reply conversationally, warmly and with natural flow. Acknowledge what I said, answer clearly, and continue the conversation with one helpful next step or question.",
      "Spoken request:",
      text,
    ].join("\n");
  }

  function sendToAssistant(text) {
    document.querySelector('[data-suite-view="intelligence"]')?.click();
    const input = $("input");
    const send = $("send");
    if (!input || !send) {
      setStatus("I couldn’t find the assistant input.");
      return;
    }
    input.value = warmPrompt(text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setStatus("I heard you. I’m thinking it through.");
    send.click();
  }

  async function ensureStream() {
    if (state.stream) return state.stream;
    if (window.IndiCareDevicePermissions?.request) {
      try {
        await window.IndiCareDevicePermissions.request({ audio: true, video: false });
      } catch (_) {}
    }
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return state.stream;
  }

  function bestMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  async function transcribeBlob(blob) {
    const form = new FormData();
    const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm";
    form.append("file", blob, `hey-indicare-${Date.now()}.${extension}`);
    const response = await fetch("/ai-notes/transcribe", {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders("POST"),
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `Transcription failed: ${response.status}`);
    return payload;
  }

  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setStatus("Audio recording is not supported in this browser.");
      return;
    }
    if (state.recording) return;
    openVoicePanel();
    const stream = await ensureStream();
    state.chunks = [];
    const mimeType = bestMimeType();
    state.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) state.chunks.push(event.data);
    };
    state.recorder.onstop = async () => {
      state.recording = false;
      document.getElementById("iNotesVoiceRecord")?.classList.remove("active");
      if (!state.chunks.length) {
        setStatus("I didn’t capture any audio.");
        return;
      }
      setStatus("I’m transcribing that through I-Notes.");
      try {
        const blob = new Blob(state.chunks, { type: state.recorder?.mimeType || "audio/webm" });
        const result = await transcribeBlob(blob);
        const transcript = String(result.transcript || "").trim();
        if (!transcript) {
          setStatus("I couldn’t hear enough to transcribe that clearly.");
          setTranscript("Try again, a little closer to the microphone.");
          return;
        }
        setTranscript(transcript);
        sendToAssistant(transcript);
      } catch (error) {
        console.error(error);
        setStatus("I-Notes transcription could not complete that audio.");
        toast("Voice transcription failed");
      }
    };
    state.recorder.start();
    state.recording = true;
    document.getElementById("iNotesVoiceRecord")?.classList.add("active");
    setStatus("Recording through I-Notes. Tap again when you’ve finished.");
    setTranscript("Recording… speak naturally.");
  }

  function stopRecording() {
    if (!state.recorder || !state.recording) return;
    state.recorder.stop();
    setStatus("Finishing recording…");
  }

  function toggleRecording() {
    if (state.recording) stopRecording();
    else startRecording().catch((error) => {
      console.error(error);
      setStatus("Microphone access is needed for voice transcription.");
      window.IndiCareDevicePermissions?.open?.();
    });
  }

  function installButton() {
    const actions = document.querySelector(".ic-voice-actions");
    if (!actions || $("iNotesVoiceRecord")) return;
    const button = document.createElement("button");
    button.id = "iNotesVoiceRecord";
    button.type = "button";
    button.textContent = "Record via I-Notes";
    button.title = "Use I-Notes transcription when browser voice recognition is unreliable";
    button.addEventListener("click", toggleRecording);
    actions.insertBefore(button, actions.children[1] || null);
  }

  function installStyles() {
    if ($("indicareVoiceTranscriptionStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareVoiceTranscriptionStyles";
    style.textContent = `#iNotesVoiceRecord.active{background:#ecfdf5;border-color:#a7f3d0;color:#047857;box-shadow:0 0 0 3px rgba(16,163,127,.12)}`;
    document.head.appendChild(style);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    const timer = setInterval(() => {
      installButton();
      if ($("iNotesVoiceRecord")) clearInterval(timer);
    }, 500);
  });
})();
