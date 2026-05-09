/* IndiCare AI product upgrades
   Focus: three standalone tools inside IndiCare AI:
   1. IndiCare AI: conversational thinking partner
   2. I-Notes: transcription, meeting intelligence and AI review
   3. IndiCare Docs: AI-native template document workspace
*/
(function () {
  const SPEAKERS_KEY = "indicare_ai_known_speakers_v1";
  const NOTE_DRAFT_KEY = "indicare_ai_notes_current_draft_v1";
  const DOC_DRAFT_KEY = "indicare_ai_docs_current_draft_v1";

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function csrfHeaders(method, base) {
    const headers = { ...(base || {}) };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) {
      const token = csrfToken();
      if (token) headers["X-CSRF-Token"] = token;
    }
    return headers;
  }

  async function apiJson(url, options) {
    const method = options?.method || "GET";
    const response = await fetch(url, {
      credentials: "include",
      ...(options || {}),
      headers: csrfHeaders(method, { "Content-Type": "application/json", ...(options?.headers || {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || `Request failed: ${response.status}`);
    return data;
  }

  async function apiForm(url, form) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders("POST"),
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || `Request failed: ${response.status}`);
    return data;
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

  function knownSpeakers() {
    try { return JSON.parse(localStorage.getItem(SPEAKERS_KEY) || "[]"); } catch (_) { return []; }
  }

  function saveKnownSpeakers(items) {
    localStorage.setItem(SPEAKERS_KEY, JSON.stringify(items.slice(0, 80)));
    renderSpeakerMemory();
  }

  function upsertSpeaker(label, name, role) {
    const items = knownSpeakers();
    const cleanLabel = String(label || "").trim() || "Speaker";
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    const existing = items.find((item) => item.label === cleanLabel || item.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      existing.label = cleanLabel;
      existing.name = cleanName;
      existing.role = String(role || existing.role || "").trim();
      existing.updatedAt = Date.now();
    } else {
      items.unshift({ id: `speaker-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: cleanLabel, name: cleanName, role: String(role || "").trim(), updatedAt: Date.now() });
    }
    saveKnownSpeakers(items);
  }

  function resolveSpeaker(label) {
    const item = knownSpeakers().find((speaker) => speaker.label === label);
    if (!item) return label || "Speaker";
    return item.role ? `${item.name} (${item.role})` : item.name;
  }

  function speakerMap() {
    return knownSpeakers().reduce((acc, speaker) => {
      if (speaker.label && speaker.name) acc[speaker.label] = speaker.role ? `${speaker.name} (${speaker.role})` : speaker.name;
      return acc;
    }, {});
  }

  function installNotesUpgradeUi() {
    const notesPanel = document.querySelector('[data-suite-panel="notes"] .ic-suite-grid');
    if (!notesPanel || $("iNotesUpgradePanel")) return;

    const panel = document.createElement("section");
    panel.id = "iNotesUpgradePanel";
    panel.className = "ic-card ic-product-upgrade-card";
    panel.innerHTML = `
      <h2>Meeting intelligence</h2>
      <p>Record or upload audio, detect speaker segments, remember adults by speaker label, and turn the meeting into a professional note.</p>
      <div class="ic-product-actions">
        <button id="iNotesRecord" type="button">Record meeting</button>
        <button id="iNotesStop" type="button" disabled>Stop and transcribe</button>
        <label class="ic-product-file">Upload audio<input id="iNotesAudioUpload" type="file" accept="audio/*,video/mp4" hidden /></label>
      </div>
      <div id="iNotesRecordingState" class="ic-live-state">Ready to record.</div>
      <div class="ic-speaker-teach">
        <select id="iNotesSpeakerLabel"><option value="">Speaker label</option></select>
        <input id="iNotesSpeakerName" type="text" placeholder="Adult name, e.g. Tom" />
        <input id="iNotesSpeakerRole" type="text" placeholder="Role, e.g. Registered Manager" />
        <button id="iNotesRememberSpeaker" type="button">Remember voice label</button>
      </div>
      <div id="iNotesSpeakerMemory" class="ic-speaker-memory"></div>
      <div class="ic-product-actions">
        <button id="iNotesGenerate" type="button">AI review note</button>
        <button id="iNotesActions" type="button">Extract actions</button>
        <button id="iNotesSave" type="button">Save note</button>
        <button id="iNotesHistory" type="button">History</button>
      </div>
      <div id="iNotesReviewOutput" class="ic-ai-review-output"></div>
    `;
    notesPanel.prepend(panel);
    renderSpeakerMemory();
    bindNotesUpgrade();
  }

  function renderSpeakerMemory() {
    const memory = $("iNotesSpeakerMemory");
    if (!memory) return;
    const items = knownSpeakers();
    if (!items.length) {
      memory.innerHTML = '<p class="ic-muted-mini">No remembered speakers yet. After transcription, assign “Speaker 1” to Tom once and I-Notes will reuse that label in future notes.</p>';
      return;
    }
    memory.innerHTML = items.map((speaker) => `
      <span class="ic-speaker-chip"><strong>${escapeHtml(speaker.name)}</strong>${speaker.role ? ` <small>${escapeHtml(speaker.role)}</small>` : ""}<em>${escapeHtml(speaker.label)}</em></span>
    `).join("");
  }

  function setRecordingState(text, active) {
    const node = $("iNotesRecordingState");
    if (!node) return;
    node.textContent = text;
    node.classList.toggle("active", !!active);
  }

  function setSpeakerOptions(segments) {
    const select = $("iNotesSpeakerLabel");
    if (!select) return;
    const labels = [...new Set((segments || []).map((segment) => segment.speaker).filter(Boolean))];
    select.innerHTML = '<option value="">Speaker label</option>' + labels.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)} → ${escapeHtml(resolveSpeaker(label))}</option>`).join("");
  }

  function renderSegmentsToTranscript(segments, fallbackTranscript) {
    const transcript = $("indicareTranscript");
    if (!transcript) return;
    if (!segments || !segments.length) {
      transcript.value = fallbackTranscript || transcript.value || "";
      return;
    }
    transcript.value = segments.map((segment) => {
      const speaker = resolveSpeaker(segment.speaker || "Speaker");
      const time = Number(segment.start || 0) > 0 ? ` [${Math.floor(Number(segment.start) / 60)}:${String(Math.floor(Number(segment.start) % 60)).padStart(2, "0")}]` : "";
      return `${speaker}${time}: ${segment.text || ""}`;
    }).join("\n");
    localStorage.setItem(NOTE_DRAFT_KEY, transcript.value);
    setSpeakerOptions(segments);
  }

  async function transcribeBlob(blob, filename) {
    const form = new FormData();
    form.append("file", blob, filename || "meeting.webm");
    setRecordingState("Transcribing with I-Notes...", true);
    const data = await apiForm("/ai-notes/transcribe", form);
    renderSegmentsToTranscript(data.segments || [], data.transcript || "");
    setRecordingState("Transcription ready. Review speakers, then generate the note.", false);
    toast("I-Notes transcription ready");
  }

  function bindNotesUpgrade() {
    let mediaRecorder = null;
    let chunks = [];

    $("iNotesRecord")?.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          try { await transcribeBlob(blob, "meeting.webm"); } catch (error) { setRecordingState(error.message, false); }
        };
        mediaRecorder.start();
        $("iNotesRecord").disabled = true;
        $("iNotesStop").disabled = false;
        setRecordingState("Recording meeting... I-Notes is listening.", true);
      } catch (error) {
        setRecordingState("Microphone access was not available. You can upload audio instead.", false);
      }
    });

    $("iNotesStop")?.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      if ($("iNotesRecord")) $("iNotesRecord").disabled = false;
      if ($("iNotesStop")) $("iNotesStop").disabled = true;
      setRecordingState("Preparing transcription...", true);
    });

    $("iNotesAudioUpload")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try { await transcribeBlob(file, file.name); } catch (error) { setRecordingState(error.message, false); }
    });

    $("iNotesRememberSpeaker")?.addEventListener("click", () => {
      upsertSpeaker($("iNotesSpeakerLabel")?.value, $("iNotesSpeakerName")?.value, $("iNotesSpeakerRole")?.value);
      $("iNotesSpeakerName").value = "";
      $("iNotesSpeakerRole").value = "";
      toast("Speaker label remembered");
    });

    $("iNotesGenerate")?.addEventListener("click", generateReviewedNote);
    $("iNotesActions")?.addEventListener("click", extractNoteActions);
    $("iNotesSave")?.addEventListener("click", saveCurrentNote);
    $("iNotesHistory")?.addEventListener("click", loadNoteHistory);

    const transcript = $("indicareTranscript");
    if (transcript) {
      transcript.value = localStorage.getItem(NOTE_DRAFT_KEY) || transcript.value || "";
      transcript.addEventListener("input", () => localStorage.setItem(NOTE_DRAFT_KEY, transcript.value));
    }
  }

  async function generateReviewedNote() {
    const transcript = $("indicareTranscript")?.value.trim();
    if (!transcript) { toast("Add or transcribe notes first"); return; }
    const output = $("iNotesReviewOutput");
    if (output) output.innerHTML = '<p class="ic-muted-mini">Reviewing note...</p>';
    const form = new FormData();
    form.append("transcript", transcript);
    const data = await apiForm("/ai-notes/generate", form);
    if (output) {
      output.innerHTML = `
        <h3>AI reviewed note</h3>
        ${data.safeguarding_flag ? `<div class="ic-review-alert"><strong>Safeguarding review suggested</strong><p>${escapeHtml(data.safeguarding_reason || "The note contains information that may need manager/DSL review.")}</p></div>` : ""}
        <div class="ic-reviewed-note">${escapeHtml(data.note || "").replace(/\n/g, "<br>")}</div>
      `;
    }
    localStorage.setItem("indicare_ai_notes_ai_draft", data.note || "");
    toast("AI review complete");
  }

  async function extractNoteActions() {
    const text = $("indicareTranscript")?.value.trim() || localStorage.getItem("indicare_ai_notes_ai_draft") || "";
    if (!text) { toast("Nothing to review yet"); return; }
    const output = $("iNotesReviewOutput");
    if (output) output.innerHTML = '<p class="ic-muted-mini">Extracting actions...</p>';
    const form = new FormData();
    form.append("text", text);
    const data = await apiForm("/ai-notes/extract-actions", form);
    const actions = Array.isArray(data.actions) ? data.actions : [];
    if (output) {
      output.innerHTML = `<h3>Actions</h3>${actions.length ? `<ul>${actions.map((action) => `<li>${escapeHtml(typeof action === "string" ? action : JSON.stringify(action))}</li>`).join("")}</ul>` : '<p class="ic-muted-mini">No clear actions found.</p>'}`;
    }
  }

  async function saveCurrentNote() {
    const transcript = $("indicareTranscript")?.value.trim();
    const draft = localStorage.getItem("indicare_ai_notes_ai_draft") || transcript || "";
    if (!transcript || !draft) { toast("Generate or write a note first"); return; }
    const form = new FormData();
    form.append("transcript", transcript);
    form.append("ai_draft", draft);
    form.append("final_note", draft);
    form.append("title", transcript.split("\n")[0]?.slice(0, 90) || "I-Note");
    form.append("template_name", "I-Notes meeting intelligence");
    form.append("meeting_format", "Meeting / voice note");
    form.append("speaker_map_json", JSON.stringify(speakerMap()));
    form.append("note_status", "draft");
    await apiForm("/ai-notes/save", form);
    toast("I-Note saved");
  }

  async function loadNoteHistory() {
    const output = $("iNotesReviewOutput");
    if (output) output.innerHTML = '<p class="ic-muted-mini">Loading history...</p>';
    const data = await apiJson("/ai-notes/history?limit=20");
    const notes = data.notes || [];
    if (output) {
      output.innerHTML = `<h3>Saved I-Notes</h3>${notes.length ? notes.map((note) => `<button class="ic-note-history-item" type="button" data-load-note="${note.id}"><strong>${escapeHtml(note.title)}</strong><span>${escapeHtml(note.excerpt || "")}</span></button>`).join("") : '<p class="ic-muted-mini">No saved notes yet.</p>'}`;
    }
  }

  function installDocsUpgradeUi() {
    const docsPanel = document.querySelector('[data-suite-panel="docs"] .ic-suite-grid');
    if (!docsPanel || $("docsUpgradePanel")) return;
    const panel = document.createElement("section");
    panel.id = "docsUpgradePanel";
    panel.className = "ic-card ic-product-upgrade-card";
    panel.innerHTML = `
      <h2>Document intelligence</h2>
      <p>Live professional review for child-centred, factual and inspection-ready documents.</p>
      <div id="docsQualityScore" class="ic-doc-score"><strong>0%</strong><span>Start writing to review this document.</span></div>
      <div id="docsQualityChecks" class="ic-doc-checks"></div>
      <div class="ic-product-actions">
        <button type="button" data-doc-intel="quality">Full AI review</button>
        <button type="button" data-doc-intel="tone">Tone check</button>
        <button type="button" data-doc-intel="safeguarding">Safeguarding check</button>
        <button type="button" data-doc-intel="export">Copy document</button>
      </div>
    `;
    docsPanel.appendChild(panel);
    bindDocsUpgrade();
    restoreDocDraft();
    reviewDocumentLocally();
  }

  function restoreDocDraft() {
    const editor = $("indicareDocEditor");
    const saved = localStorage.getItem(DOC_DRAFT_KEY);
    if (editor && saved && !editor.dataset.restored) {
      editor.innerHTML = saved;
      editor.dataset.restored = "true";
    }
  }

  function documentText() {
    return $("indicareDocEditor")?.innerText || "";
  }

  function reviewDocumentLocally() {
    const text = documentText();
    const lower = text.toLowerCase();
    const checks = [
      { label: "Facts separated from opinion", ok: /fact|known|evidence|recorded|observed/.test(lower) },
      { label: "Chronology or time sequence", ok: /chronology|timeline|time|date|\d{1,2}:\d{2}/.test(lower) },
      { label: "Child voice considered", ok: /child voice|said|wishes|feelings|presentation|direct words/.test(lower) },
      { label: "Safeguarding considered", ok: /safeguarding|risk|harm|concern|missing|police/.test(lower) },
      { label: "Management oversight", ok: /manager|oversight|review|action|follow-up|follow up/.test(lower) },
      { label: "Professional wording", ok: !/naughty|kicked off|attention seeking|manipulative|bad behaviour/.test(lower) },
    ];
    const passed = checks.filter((item) => item.ok).length;
    const score = text.trim() ? Math.round((passed / checks.length) * 100) : 0;
    const scoreNode = $("docsQualityScore");
    if (scoreNode) scoreNode.innerHTML = `<strong>${score}%</strong><span>${score >= 80 ? "Strong professional draft." : score >= 50 ? "Good start. Review highlighted gaps." : "Needs more structure and evidence."}</span>`;
    const checksNode = $("docsQualityChecks");
    if (checksNode) {
      checksNode.innerHTML = checks.map((item) => `<div class="ic-doc-check ${item.ok ? "ok" : "gap"}"><span>${item.ok ? "✓" : "!"}</span>${escapeHtml(item.label)}</div>`).join("");
    }
  }

  function bindDocsUpgrade() {
    const editor = $("indicareDocEditor");
    if (editor) {
      editor.addEventListener("input", () => {
        localStorage.setItem(DOC_DRAFT_KEY, editor.innerHTML);
        reviewDocumentLocally();
      });
    }
    document.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-doc-intel]");
      if (!action) return;
      const mode = action.getAttribute("data-doc-intel");
      const text = documentText();
      if (mode === "export") {
        try { await navigator.clipboard.writeText(text); toast("Document copied"); } catch (_) { toast("Copy failed"); }
        return;
      }
      if (!text.trim()) { toast("Write or choose a template first"); return; }
      const prompts = {
        quality: "Review this residential children’s home document. Score factuality, chronology, child voice, safeguarding, manager oversight and professional wording. Then give a paste-ready improved version.",
        tone: "Review this document for tone. Remove judgemental wording, assumptions and emotional language. Keep it factual, professional and child-centred.",
        safeguarding: "Review this document for safeguarding concerns, missing information, escalation points, notifications and manager/DSL review actions. Do not make final threshold decisions.",
      };
      const input = $("input");
      document.querySelector('[data-suite-view="intelligence"]')?.click();
      if (input) {
        input.value = `${prompts[mode]}\n\nDocument:\n${text}`;
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function bindHistoryLoader() {
    document.addEventListener("click", async (event) => {
      const item = event.target.closest("[data-load-note]");
      if (!item) return;
      const data = await apiJson(`/ai-notes/history/${item.getAttribute("data-load-note")}`);
      const note = data.note || {};
      if ($("indicareTranscript")) $("indicareTranscript").value = note.transcript || "";
      localStorage.setItem("indicare_ai_notes_ai_draft", note.final_note || note.ai_draft || "");
      const output = $("iNotesReviewOutput");
      if (output) output.innerHTML = `<h3>${escapeHtml(note.title || "I-Note")}</h3><div class="ic-reviewed-note">${escapeHtml(note.final_note || note.ai_draft || "").replace(/\n/g, "<br>")}</div>`;
      toast("I-Note loaded");
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    installNotesUpgradeUi();
    installDocsUpgradeUi();
    bindHistoryLoader();
  });
})();
