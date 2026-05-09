/* IndiCare Voice Setup
   First-use voice setup for the standalone assistant.
   This is NOT biometric identification. It checks mic quality, accent/speech capture,
   consent preferences and creates a confirmed speaker profile for I-Notes workflows.
*/
(function () {
  const SETUP_KEY = "indicare_voice_setup_complete";
  const PROFILE_KEY = "indicare_voice_setup_profile";
  const SAMPLE_KEY = "indicare_voice_setup_samples";

  const PHRASES = [
    "Hey IndiCare, help me prepare for handover.",
    "IndiCare, summarise this meeting and identify the actions.",
    "IndiCare, help me think this through calmly.",
  ];

  const state = { index: 0, stream: null, recorder: null, chunks: [], samples: [], recording: false };
  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

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

  function profileName() {
    try {
      const profile = JSON.parse(localStorage.getItem("indicare_assistant_user_profile") || "{}");
      return profile.name || "Adult";
    } catch (_) { return "Adult"; }
  }

  function shouldShow() {
    return /assistant/i.test(window.location.pathname || "") && localStorage.getItem(SETUP_KEY) !== "true";
  }

  function installStyles() {
    if ($("indicareVoiceSetupStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareVoiceSetupStyles";
    style.textContent = `
      .ic-voice-setup{position:fixed;inset:0;z-index:110;display:grid;place-items:center;background:rgba(15,23,42,.34);backdrop-filter:blur(12px);padding:18px}.ic-voice-setup-card{width:min(700px,calc(100vw - 28px));background:#fff;border:1px solid var(--shell-line,#e5e7eb);border-radius:28px;box-shadow:0 34px 100px rgba(15,23,42,.28);overflow:hidden}.ic-voice-setup-head{display:flex;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid var(--shell-line,#e5e7eb)}.ic-voice-setup-head strong{display:block;font-size:20px;font-weight:950;color:var(--shell-text,#111827);letter-spacing:-.02em}.ic-voice-setup-head span{display:block;margin-top:5px;color:var(--shell-muted,#6b7280);font-size:13px;line-height:1.45}.ic-voice-setup-head button{border:0;background:#f3f4f6;color:#374151;border-radius:13px;width:38px;height:38px;font-size:22px}.ic-voice-setup-body{padding:20px;display:grid;gap:16px}.ic-voice-setup-progress{height:8px;border-radius:999px;background:#eef2f7;overflow:hidden}.ic-voice-setup-progress span{display:block;height:100%;width:0;background:#10a37f;transition:width .25s ease}.ic-voice-phrase{border:1px solid #d1fae5;background:#ecfdf5;border-radius:22px;padding:18px}.ic-voice-phrase small{display:block;color:#047857;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}.ic-voice-phrase p{margin:8px 0 0;color:#064e3b;font-size:22px;font-weight:950;line-height:1.28;letter-spacing:-.02em}.ic-voice-setup-status{color:var(--shell-muted,#6b7280);font-size:13px;line-height:1.5}.ic-voice-setup-consent{border:1px solid var(--shell-line,#e5e7eb);background:#fbfbfc;border-radius:16px;padding:12px;display:grid;gap:8px}.ic-voice-setup-consent label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--shell-text,#111827);line-height:1.45}.ic-voice-samples{display:grid;gap:8px}.ic-voice-sample{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--shell-line,#e5e7eb);background:#fbfbfc;border-radius:15px;padding:10px 12px;font-size:12px}.ic-voice-sample strong{color:var(--shell-text,#111827)}.ic-voice-sample span{color:var(--shell-muted,#6b7280)}.ic-voice-setup-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;padding:16px 20px 20px;border-top:1px solid var(--shell-line,#e5e7eb);background:#fbfbfc}.ic-voice-setup-actions button{border:1px solid var(--shell-line,#e5e7eb);background:#fff;color:var(--shell-text,#111827);border-radius:999px;padding:10px 14px;font-size:13px;font-weight:900}.ic-voice-setup-actions button.primary{background:#111827;color:#fff;border-color:#111827}.ic-voice-setup-actions button.recording{background:#fef2f2;border-color:#fecaca;color:#991b1b}.ic-voice-setup-note{font-size:12px;color:var(--shell-muted,#6b7280);line-height:1.45;margin:0}.hidden{display:none!important}@media(max-width:720px){.ic-voice-setup{place-items:end center;padding:12px}.ic-voice-setup-card{border-radius:24px}.ic-voice-phrase p{font-size:18px}.ic-voice-setup-actions{justify-content:stretch}.ic-voice-setup-actions button{flex:1 1 auto}}
    `;
    document.head.appendChild(style);
  }

  function installUi() {
    if ($("voiceSetupModal")) return;
    const modal = document.createElement("section");
    modal.id = "voiceSetupModal";
    modal.className = "ic-voice-setup hidden";
    modal.innerHTML = `
      <div class="ic-voice-setup-card" role="dialog" aria-label="Set up IndiCare voice">
        <div class="ic-voice-setup-head">
          <div><strong>Set up your IndiCare voice</strong><span>Read a few short phrases so IndiCare can check your microphone, accent capture and speech clarity for Hey IndiCare and I-Notes.</span></div>
          <button id="voiceSetupClose" type="button" aria-label="Close voice setup">×</button>
        </div>
        <div class="ic-voice-setup-body">
          <div class="ic-voice-setup-progress"><span id="voiceSetupProgress"></span></div>
          <div class="ic-voice-phrase"><small id="voiceSetupStep">Phrase 1 of ${PHRASES.length}</small><p id="voiceSetupPhrase"></p></div>
          <div id="voiceSetupStatus" class="ic-voice-setup-status">When you are ready, press record and read the sentence naturally.</div>
          <div class="ic-voice-setup-consent">
            <label><input id="voiceSetupRememberSpeaker" type="checkbox" checked /> Remember my confirmed speaker name for I-Notes and meetings.</label>
            <label><input id="voiceSetupImproveCapture" type="checkbox" checked /> Use these samples to improve setup prompts, microphone checks and accent capture guidance.</label>
          </div>
          <div id="voiceSetupSamples" class="ic-voice-samples"></div>
          <p class="ic-voice-setup-note">This setup does not identify people automatically by biometric voiceprint. I-Notes can use confirmed speaker labels and future consent-based identity tools.</p>
        </div>
        <div class="ic-voice-setup-actions">
          <button id="voiceSetupSkip" type="button">Skip for now</button>
          <button id="voiceSetupRecord" type="button" class="primary">Record phrase</button>
          <button id="voiceSetupFinish" type="button" disabled>Finish setup</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function setStatus(text) { if ($("voiceSetupStatus")) $("voiceSetupStatus").textContent = text; }

  function render() {
    if ($("voiceSetupPhrase")) $("voiceSetupPhrase").textContent = PHRASES[state.index] || PHRASES[PHRASES.length - 1];
    if ($("voiceSetupStep")) $("voiceSetupStep").textContent = `Phrase ${Math.min(state.index + 1, PHRASES.length)} of ${PHRASES.length}`;
    if ($("voiceSetupProgress")) $("voiceSetupProgress").style.width = `${Math.round((state.samples.length / PHRASES.length) * 100)}%`;
    if ($("voiceSetupFinish")) $("voiceSetupFinish").disabled = state.samples.length < 2;
    if ($("voiceSetupRecord")) {
      $("voiceSetupRecord").textContent = state.recording ? "Stop recording" : "Record phrase";
      $("voiceSetupRecord").classList.toggle("recording", state.recording);
      $("voiceSetupRecord").classList.toggle("primary", !state.recording);
    }
    const samples = $("voiceSetupSamples");
    if (samples) samples.innerHTML = state.samples.map((sample, index) => `<div class="ic-voice-sample"><strong>Sample ${index + 1}</strong><span>${esc(sample.transcript || "Captured")}</span></div>`).join("");
  }

  function open(force) {
    installStyles(); installUi();
    if (!force && !shouldShow()) return;
    state.index = Math.min(state.samples.length, PHRASES.length - 1);
    $("voiceSetupModal")?.classList.remove("hidden");
    render();
  }

  function close(markComplete) {
    if (markComplete) localStorage.setItem(SETUP_KEY, "true");
    $("voiceSetupModal")?.classList.add("hidden");
  }

  async function ensureStream() {
    if (state.stream) return state.stream;
    if (window.IndiCareDevicePermissions?.request) {
      try { await window.IndiCareDevicePermissions.request({ audio: true, video: false }); } catch (_) {}
    }
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return state.stream;
  }

  function bestMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return candidates.find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || "";
  }

  async function transcribe(blob) {
    const form = new FormData();
    const extension = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm";
    form.append("file", blob, `voice-setup-${Date.now()}.${extension}`);
    const response = await fetch("/ai-notes/transcribe", { method: "POST", credentials: "include", headers: csrfHeaders("POST"), body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `Transcription failed: ${response.status}`);
    return payload;
  }

  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { setStatus("This browser cannot record voice samples. Try Chrome or Edge."); return; }
    const stream = await ensureStream();
    const mimeType = bestMimeType();
    state.chunks = [];
    state.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.recorder.ondataavailable = (event) => { if (event.data && event.data.size > 0) state.chunks.push(event.data); };
    state.recorder.onstop = onRecordingStopped;
    state.recording = true;
    state.recorder.start();
    setStatus("Recording. Read the sentence naturally, then press stop.");
    render();
  }

  async function onRecordingStopped() {
    state.recording = false; render();
    if (!state.chunks.length) { setStatus("I didn’t capture any audio. Try again."); return; }
    setStatus("Checking that phrase through I-Notes transcription...");
    try {
      const blob = new Blob(state.chunks, { type: state.recorder?.mimeType || "audio/webm" });
      const result = await transcribe(blob);
      const transcript = String(result.transcript || "").trim();
      state.samples.push({ expected_phrase: PHRASES[state.index], transcript, duration: result.duration || null, captured_at: new Date().toISOString() });
      state.index = Math.min(state.samples.length, PHRASES.length - 1);
      localStorage.setItem(SAMPLE_KEY, JSON.stringify(state.samples));
      setStatus(transcript ? "Good. I captured that clearly." : "Sample captured, but the words were not clear. You can record again or continue.");
      render();
    } catch (error) {
      console.error(error); setStatus("I couldn’t process that sample. Please try again.");
    }
  }

  function stopRecording() { if (state.recorder && state.recording) { state.recorder.stop(); setStatus("Finishing sample..."); } }

  function finish() {
    const profile = {
      setup_complete: true,
      display_name: profileName(),
      samples_count: state.samples.length,
      language: "en-GB",
      remember_speaker_label: !!$("voiceSetupRememberSpeaker")?.checked,
      improve_capture_guidance: !!$("voiceSetupImproveCapture")?.checked,
      created_at: new Date().toISOString(),
      note: "Non-biometric voice setup for microphone/accent capture and confirmed speaker labelling.",
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(SAMPLE_KEY, JSON.stringify(state.samples));
    localStorage.setItem(SETUP_KEY, "true");
    window.dispatchEvent(new CustomEvent("indicare:voice-setup-complete", { detail: profile }));
    close(false);
    window.IndiCareAliveVoice?.speak?.("Voice setup is complete. I’ll use this to support clearer voice capture and confirmed speaker labels in I-Notes.");
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#voiceSetupClose")) return close(true);
      if (event.target.closest("#voiceSetupSkip")) return close(true);
      if (event.target.closest("#voiceSetupRecord")) return state.recording ? stopRecording() : startRecording().catch((error) => { console.error(error); setStatus("Microphone access is needed for voice setup."); window.IndiCareDevicePermissions?.open?.(); });
      if (event.target.closest("#voiceSetupFinish")) return finish();
      if (event.target.closest("#openVoiceSetup")) return open(true);
    });
  }

  function installTopButton() {
    const actions = document.querySelector(".ic-top-actions");
    if (!actions || $("openVoiceSetup")) return;
    const button = document.createElement("button");
    button.id = "openVoiceSetup";
    button.className = "ic-nav-btn ic-top-tool";
    button.type = "button";
    button.textContent = "Voice setup";
    button.title = "Set up voice capture and confirmed speaker label";
    actions.insertBefore(button, actions.children[5] || null);
  }

  window.IndiCareVoiceSetup = { open: () => open(true), profile: () => JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") };
  window.addEventListener("DOMContentLoaded", () => { installStyles(); installUi(); bind(); installTopButton(); window.setTimeout(() => open(false), 1400); });
})();
