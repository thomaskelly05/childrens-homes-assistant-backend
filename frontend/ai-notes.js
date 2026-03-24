document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const els = {
    recordBtn: $("recordBtn"),
    recordBtnSidebar: $("recordBtnSidebar"),
    transcribeBtn: $("transcribeBtn"),
    renameSpeakersBtn: $("renameSpeakersBtn"),
    extractActionsBtn: $("extractActionsBtn"),
    extractActionsBtnInline: $("extractActionsBtnInline"),
    useTranscriptForAiBtn: $("useTranscriptForAiBtn"),
    copyTranscriptBtn: $("copyTranscriptBtn"),
    aiBtn: $("aiBtn"),
    runINotesBtn: $("runINotesBtn"),
    voicePromptBtn: $("voicePromptBtn"),
    dictateNoteBtn: $("dictateNoteBtn"),
    saveBtn: $("saveBtn"),
    printBtn: $("printBtn"),
    pdfBtn: $("pdfBtn"),
    docxBtn: $("docxBtn"),
    clearBtn: $("clearBtn"),
    resetBtn: $("resetBtn"),
    versionsBtn: $("versionsBtn"),
    refreshBtn: $("refreshBtn"),
    searchInput: $("searchInput"),

    workspaceTabBtn: $("workspaceTabBtn"),
    savedTabBtn: $("savedTabBtn"),
    workspacePanel: $("workspacePanel"),
    savedPanel: $("savedPanel"),

    viewFinalBtn: $("viewFinalBtn"),
    viewSourceBtn: $("viewSourceBtn"),
    viewActionsBtn: $("viewActionsBtn"),
    viewStructuredBtn: $("viewStructuredBtn"),
    finalViewPanel: $("finalViewPanel"),
    sourceViewPanel: $("sourceViewPanel"),
    actionsViewPanel: $("actionsViewPanel"),
    structuredViewPanel: $("structuredViewPanel"),

    title: $("title"),
    prompt: $("prompt"),
    transcript: $("transcript"),
    note: $("note"),
    meetingFormat: $("meetingFormat"),
    noteStatus: $("noteStatus"),
    documentTemplate: $("documentTemplate"),
    outputMode: $("outputMode"),
    incidentSeverity: $("incidentSeverity"),

    status: $("status"),
    saveState: $("saveState"),
    statusDot: $("statusDot"),
    list: $("list"),
    empty: $("empty"),

    speakerMapList: $("speakerMapList"),
    speakerTimeline: $("speakerTimeline"),
    speakerCountBadge: $("speakerCountBadge"),
    actionCountBadge: $("actionCountBadge"),
    actionsList: $("actionsList"),
    intelligenceFlags: $("intelligenceFlags"),
    meetingTypeBadge: $("meetingTypeBadge"),

    structuredWho: $("structuredWho"),
    structuredWhat: $("structuredWhat"),
    structuredStaffResponse: $("structuredStaffResponse"),
    structuredOutcome: $("structuredOutcome"),
    structuredInjury: $("structuredInjury"),
    structuredFollowUp: $("structuredFollowUp"),
    structuredBodyLocation: $("structuredBodyLocation"),
    structuredMedicalAttention: $("structuredMedicalAttention"),
    structuredNotifications: $("structuredNotifications"),
    structuredMissingInfo: $("structuredMissingInfo"),
    structuredFlags: $("structuredFlags"),
    buildStructuredIntoNoteBtn: $("buildStructuredIntoNoteBtn"),

    modal: $("modal"),
    timer: $("timer"),
    recState: $("recState"),
    mic: $("mic"),
    pauseBtn: $("pauseBtn"),
    resumeBtn: $("resumeBtn"),
    cancelBtn: $("cancelBtn"),
    stopBtn: $("stopBtn"),

    versionsModal: $("versionsModal"),
    closeVersionsBtn: $("closeVersionsBtn"),
    versionsList: $("versionsList"),

    toast: $("toast"),
    audio: $("audio")
  };

  const state = {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    blob: null,
    recordingExtension: "webm",
    timerInt: null,
    startAt: 0,
    pausedAt: 0,
    pausedMs: 0,
    noteId: null,
    saved: [],
    filtered: [],
    dirty: false,
    speakerSegments: [],
    speakerMap: {},
    extractedActions: [],
    intelligenceFlags: [],
    detectedMeetingType: "",
    transcriptConfidence: null
  };

  const OUTPUT_MODE_PROMPTS = {
    final_note:
      "Rewrite this as a professional children's home record. Use factual, neutral, defensible language. Separate observation from interpretation. Keep it clear, concise, and suitable for management and Ofsted review.",
    incident_record:
      "Rewrite this as a formal incident record for a children's home. Use chronological, factual, neutral language. Include what happened, staff response, outcome, injuries if any, notifications, and follow-up. Do not invent facts.",
    chronology:
      "Turn this into a chronology entry. Keep it concise, factual, date-neutral unless dates are stated, and suitable for chronology recording.",
    safeguarding_summary:
      "Extract and summarise all safeguarding concerns, risks, immediate actions, missing details, and follow-up needed. Use clear factual wording suitable for a manager or safeguarding lead.",
    manager_summary:
      "Rewrite this as a manager summary. Highlight key issues, risks, patterns, decisions, actions, follow-up, and anything requiring oversight or escalation.",
    supervision_record:
      "Rewrite this as a formal supervision record using professional language. Include discussion themes, well-being, performance/support issues, reflection, agreed actions, and next steps."
  };

  const headers = (extra = {}) => ({ ...extra });

  const fetchWithSession = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: headers(options.headers || {})
    });
    return response;
  };

  const safeJson = async response => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || "Invalid server response" };
    }
  };

  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const showToast = message => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  };

  const statusText = value => {
    if (els.status) els.status.textContent = value;
  };

  const setStatusMode = mode => {
    if (!els.statusDot) return;
    els.statusDot.className = `dot ${mode}`;
  };

  const setSaveState = (mode, text) => {
    if (!els.saveState) return;
    els.saveState.className = `save-state ${mode}`;
    els.saveState.textContent = text;
  };

  const markDirty = () => {
    state.dirty = true;
    setSaveState("dirty", "Unsaved changes");
  };

  const markSaved = () => {
    state.dirty = false;
    setSaveState("saved", "Saved");
  };

  const formatTime = secs =>
    `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  const formatTimecode = secs => {
    const total = Math.max(0, Math.floor(Number(secs) || 0));
    const mins = String(Math.floor(total / 60)).padStart(2, "0");
    const sec = String(total % 60).padStart(2, "0");
    return `${mins}:${sec}`;
  };

  const elapsed = () => {
    if (!state.startAt) return 0;
    const now = state.pausedAt || Date.now();
    return Math.max(0, Math.floor((now - state.startAt - state.pausedMs) / 1000));
  };

  const escapeHtml = value =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const titleFrom = text =>
    (String(text || "").split("\n").map(x => x.trim()).find(Boolean) || "Meeting note")
      .replace(/[:#*-]/g, "")
      .slice(0, 120);

  const notePreview = text => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > 110 ? `${clean.slice(0, 110)}…` : clean;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const uniqueSpeakers = () => {
    const speakers = state.speakerSegments.map(x => x.speaker).filter(Boolean);
    return [...new Set(speakers)];
  };

  function setActiveTab(tab) {
    const workspace = tab === "workspace";
    els.workspaceTabBtn?.classList.toggle("active", workspace);
    els.savedTabBtn?.classList.toggle("active", !workspace);
    els.workspacePanel?.classList.toggle("active", workspace);
    els.savedPanel?.classList.toggle("active", !workspace);
  }

  function setNoteView(view) {
    const views = {
      final: [els.viewFinalBtn, els.finalViewPanel],
      source: [els.viewSourceBtn, els.sourceViewPanel],
      actions: [els.viewActionsBtn, els.actionsViewPanel],
      structured: [els.viewStructuredBtn, els.structuredViewPanel]
    };

    Object.entries(views).forEach(([key, [btn, panel]]) => {
      btn?.classList.toggle("active", key === view);
      panel?.classList.toggle("active", key === view);
    });
  }

  function updateLockState() {
    const locked = els.noteStatus?.value === "approved";

    [
      els.title,
      els.prompt,
      els.note,
      els.meetingFormat,
      els.documentTemplate,
      els.outputMode,
      els.incidentSeverity,
      els.structuredWho,
      els.structuredWhat,
      els.structuredStaffResponse,
      els.structuredOutcome,
      els.structuredInjury,
      els.structuredFollowUp,
      els.structuredBodyLocation,
      els.structuredMedicalAttention,
      els.structuredNotifications,
      els.structuredMissingInfo
    ].forEach(el => {
      if (el) el.disabled = locked;
    });

    [
      els.aiBtn,
      els.useTranscriptForAiBtn,
      els.copyTranscriptBtn,
      els.runINotesBtn,
      els.buildStructuredIntoNoteBtn,
      els.voicePromptBtn,
      els.dictateNoteBtn
    ].forEach(el => {
      if (el) el.disabled = locked;
    });

    if (locked) {
      statusText("Approved and locked");
      setStatusMode("success");
    } else if (!state.dirty) {
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  function buildSpeakerAwareTranscript() {
    if (!state.speakerSegments.length) {
      return (els.transcript?.value || "").trim();
    }

    return state.speakerSegments
      .map(segment => {
        const speaker = state.speakerMap[segment.speaker] || segment.speaker || "Speaker";
        return `${speaker}: ${segment.text}`;
      })
      .join("\n\n");
  }

  function buildStructuredIncidentText() {
    return [
      `Who was involved:\n${(els.structuredWho?.value || "").trim()}`,
      `What happened:\n${(els.structuredWhat?.value || "").trim()}`,
      `What staff did:\n${(els.structuredStaffResponse?.value || "").trim()}`,
      `Outcome:\n${(els.structuredOutcome?.value || "").trim()}`,
      `Injury details:\n${(els.structuredInjury?.value || "").trim()}`,
      `Body location:\n${(els.structuredBodyLocation?.value || "").trim()}`,
      `Medical attention:\n${(els.structuredMedicalAttention?.value || "").trim()}`,
      `Notifications made:\n${(els.structuredNotifications?.value || "").trim()}`,
      `Follow-up actions:\n${(els.structuredFollowUp?.value || "").trim()}`,
      `Missing information:\n${(els.structuredMissingInfo?.value || "").trim()}`,
      `Severity:\n${(els.incidentSeverity?.value || "").trim()}`
    ].join("\n\n").trim();
  }

  function detectMeetingTypeFromContent(text) {
    const t = String(text || "").toLowerCase();

    if (t.includes("supervision")) return "Supervision";
    if (t.includes("safeguarding")) return "Safeguarding";
    if (t.includes("pep")) return "PEP";
    if (t.includes("incident") || t.includes("injury") || t.includes("restraint")) return "Incident";
    if (t.includes("review")) return "Review";
    if (t.includes("manager")) return "Manager";
    return "";
  }

  function buildIntelligenceFlags() {
    const source = [
      buildSpeakerAwareTranscript(),
      els.note?.value || "",
      buildStructuredIncidentText()
    ].join("\n").toLowerCase();

    const flags = [];

    if (source.includes("hit") || source.includes("kicked") || source.includes("punched") || source.includes("restraint")) {
      flags.push({ level: "alert", text: "Possible physical incident or restrictive practice mentioned." });
    }

    if (source.includes("missing") || source.includes("ran away") || source.includes("absent without")) {
      flags.push({ level: "alert", text: "Possible missing-from-home / absent-without-authorisation issue." });
    }

    if (source.includes("injury") || source.includes("bruise") || source.includes("mark")) {
      if (!(els.structuredInjury?.value || "").trim()) {
        flags.push({ level: "warn", text: "Possible injury mentioned but structured injury detail is blank." });
      }
    }

    if ((source.includes("safeguard") || source.includes("allegation") || source.includes("disclosure")) &&
        !(els.structuredFollowUp?.value || "").trim()) {
      flags.push({ level: "warn", text: "Possible safeguarding concern mentioned but follow-up actions are not clearly recorded." });
    }

    if ((els.structuredWhat?.value || "").trim() && !(els.structuredStaffResponse?.value || "").trim()) {
      flags.push({ level: "warn", text: "Incident detail present but staff response is missing." });
    }

    if ((els.structuredWhat?.value || "").trim() && !(els.structuredOutcome?.value || "").trim()) {
      flags.push({ level: "warn", text: "Incident detail present but outcome is missing." });
    }

    if ((els.structuredWhat?.value || "").trim() && !(els.structuredFollowUp?.value || "").trim()) {
      flags.push({ level: "warn", text: "Incident detail present but follow-up is missing." });
    }

    if (!uniqueSpeakers().length && (els.transcript?.value || "").trim()) {
      flags.push({ level: "info", text: "Transcript available but speaker separation is not populated." });
    }

    state.intelligenceFlags = flags;
    renderIntelligenceFlags(flags);
    renderStructuredFlags(flags);

    return flags;
  }

  function renderIntelligenceFlags(flags) {
    if (!els.intelligenceFlags) return;
    els.intelligenceFlags.innerHTML = "";

    if (!flags.length) {
      els.intelligenceFlags.innerHTML = `<div class="empty-text">No flags yet.</div>`;
      return;
    }

    flags.forEach(flag => {
      const item = document.createElement("div");
      item.className = `flag-item ${flag.level || "info"}`;
      item.textContent = flag.text || "";
      els.intelligenceFlags.appendChild(item);
    });
  }

  function renderStructuredFlags(flags) {
    if (!els.structuredFlags) return;
    els.structuredFlags.innerHTML = "";

    if (!flags.length) {
      els.structuredFlags.innerHTML = `<div class="empty-text">No live flags yet.</div>`;
      return;
    }

    flags.forEach(flag => {
      const item = document.createElement("div");
      item.className = `flag-item ${flag.level || "info"}`;
      item.textContent = flag.text || "";
      els.structuredFlags.appendChild(item);
    });
  }

  function renderSpeakerMap() {
    if (!els.speakerMapList || !els.speakerCountBadge) return;

    const speakers = uniqueSpeakers();
    els.speakerCountBadge.textContent = String(speakers.length);
    els.speakerMapList.innerHTML = "";

    if (!speakers.length) {
      els.speakerMapList.innerHTML = `<div class="speaker-empty">No speakers detected yet.</div>`;
      return;
    }

    speakers.forEach(speaker => {
      const row = document.createElement("div");
      row.className = "speaker-map-row";
      row.innerHTML = `
        <div class="speaker-label">${escapeHtml(speaker)}</div>
        <input type="text" value="${escapeHtml(state.speakerMap[speaker] || "")}" placeholder="Rename speaker" data-speaker-key="${escapeHtml(speaker)}">
      `;
      els.speakerMapList.appendChild(row);
    });
  }

  function renderSpeakerTimeline() {
    if (!els.speakerTimeline) return;
    els.speakerTimeline.innerHTML = "";

    if (!state.speakerSegments.length) {
      els.speakerTimeline.innerHTML = `<div class="speaker-empty">No speaker timeline yet.</div>`;
      return;
    }

    state.speakerSegments.forEach(segment => {
      const speaker = state.speakerMap[segment.speaker] || segment.speaker || "Speaker";
      const item = document.createElement("div");
      item.className = "timeline-item";
      item.innerHTML = `
        <div class="timeline-meta">
          <span class="timeline-speaker">${escapeHtml(speaker)}</span>
          <span class="timeline-time">${escapeHtml(formatTimecode(segment.start))}${segment.end !== undefined ? ` - ${escapeHtml(formatTimecode(segment.end))}` : ""}</span>
        </div>
        <div class="timeline-text">${escapeHtml(segment.text || "")}</div>
      `;
      els.speakerTimeline.appendChild(item);
    });
  }

  function renderActions() {
    if (!els.actionsList) return;
    els.actionsList.innerHTML = "";

    if (els.actionCountBadge) {
      els.actionCountBadge.textContent = String(state.extractedActions.length);
    }

    if (!state.extractedActions.length) {
      els.actionsList.innerHTML = `<div class="speaker-empty">No extracted actions yet.</div>`;
      return;
    }

    state.extractedActions.forEach(action => {
      const item = document.createElement("div");
      item.className = "action-item";
      item.innerHTML = `
        <div class="action-title">${escapeHtml(action.title || "Untitled action")}</div>
        <div class="action-meta">
          <span class="action-pill">Owner: ${escapeHtml(action.owner || "Not specified")}</span>
          <span class="action-pill">Due: ${escapeHtml(action.due || "Not specified")}</span>
          <span class="action-pill">Priority: ${escapeHtml(action.priority || "medium")}</span>
        </div>
      `;
      els.actionsList.appendChild(item);
    });
  }

  async function verifyAuth() {
    try {
      const response = await fetchWithSession("/auth/me");
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return false;
        }
        alert(data.detail || "Could not load account");
        return false;
      }

      return true;
    } catch {
      alert("Could not connect to authentication service.");
      return false;
    }
  }

  function openModal() {
    els.modal?.classList.remove("hide");
  }

  function closeModal() {
    els.modal?.classList.add("hide");
    els.mic?.classList.remove("paused");
  }

  function openVersionsModal() {
    els.versionsModal?.classList.remove("hide");
  }

  function closeVersionsModal() {
    els.versionsModal?.classList.add("hide");
  }

  function startTimer() {
    stopTimer();
    state.startAt = Date.now();
    state.pausedAt = 0;
    state.pausedMs = 0;
    state.timerInt = setInterval(() => {
      if (els.timer) els.timer.textContent = formatTime(elapsed());
    }, 250);
  }

  function stopTimer() {
    if (state.timerInt) {
      clearInterval(state.timerInt);
      state.timerInt = null;
    }
  }

  function resetRecordingState() {
    state.chunks = [];
    state.blob = null;
    stopTimer();
    if (els.timer) els.timer.textContent = "00:00";
    if (els.recState) els.recState.textContent = "Recording...";
    if (els.pauseBtn) els.pauseBtn.disabled = true;
    if (els.resumeBtn) els.resumeBtn.disabled = true;
    if (els.cancelBtn) els.cancelBtn.disabled = true;
    if (els.stopBtn) els.stopBtn.disabled = true;
  }

  const getSupportedRecordingOptions = () => {
    const candidates = [
      { mimeType: "audio/webm;codecs=opus", extension: "webm" },
      { mimeType: "audio/webm", extension: "webm" },
      { mimeType: "audio/mp4", extension: "mp4" },
      { mimeType: "audio/ogg;codecs=opus", extension: "ogg" }
    ];

    for (const option of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(option.mimeType)) {
        return option;
      }
    }

    return { mimeType: "", extension: "webm" };
  };

  async function startRecording() {
    try {
      resetRecordingState();

      const option = getSupportedRecordingOptions();
      state.recordingExtension = option.extension;

      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      state.mediaRecorder = option.mimeType
        ? new MediaRecorder(state.stream, { mimeType: option.mimeType })
        : new MediaRecorder(state.stream);

      state.mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) state.chunks.push(event.data);
      };

      state.mediaRecorder.onstop = async () => {
        state.blob = new Blob(state.chunks, { type: option.mimeType || "audio/webm" });
        if (state.stream) state.stream.getTracks().forEach(track => track.stop());
        if (els.audio) els.audio.src = URL.createObjectURL(state.blob);

        closeModal();
        statusText("Transcribing...");
        setStatusMode("processing");
        if (els.transcribeBtn) els.transcribeBtn.disabled = false;
        setActiveTab("workspace");
        await transcribeAudio(true);
      };

      state.mediaRecorder.start(1000);

      if (els.recState) els.recState.textContent = "Recording...";
      if (els.pauseBtn) els.pauseBtn.disabled = false;
      if (els.resumeBtn) els.resumeBtn.disabled = true;
      if (els.cancelBtn) els.cancelBtn.disabled = false;
      if (els.stopBtn) els.stopBtn.disabled = false;

      startTimer();
      openModal();
      statusText("Recording");
      setStatusMode("recording");
    } catch (error) {
      console.error(error);
      alert("Unable to access microphone.");
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  function pauseRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
    state.mediaRecorder.pause();
    state.pausedAt = Date.now();
    if (els.recState) els.recState.textContent = "Paused";
    if (els.pauseBtn) els.pauseBtn.disabled = true;
    if (els.resumeBtn) els.resumeBtn.disabled = false;
    els.mic?.classList.add("paused");
  }

  function resumeRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "paused") return;
    state.mediaRecorder.resume();
    if (state.pausedAt) {
      state.pausedMs += Date.now() - state.pausedAt;
      state.pausedAt = 0;
    }
    if (els.recState) els.recState.textContent = "Recording...";
    if (els.pauseBtn) els.pauseBtn.disabled = false;
    if (els.resumeBtn) els.resumeBtn.disabled = true;
    els.mic?.classList.remove("paused");
  }

  function cancelRecording() {
    const confirmed = window.confirm("Cancel this recording?");
    if (!confirmed) return;

    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.stop();
    }

    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    resetRecordingState();
    closeModal();
    statusText("Ready");
    setStatusMode("idle");
    showToast("Recording cancelled.");
  }

  function stopRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") return;
    if (state.pausedAt) {
      state.pausedMs += Date.now() - state.pausedAt;
      state.pausedAt = 0;
    }
    stopTimer();
    state.mediaRecorder.stop();
  }

  async function transcribeAudio(autoINotes = false) {
    if (!state.blob) {
      alert("Please record audio first.");
      return;
    }

    const form = new FormData();
    form.append("file", state.blob, `meeting-note.${state.recordingExtension}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetchWithSession("/ai-notes/transcribe", {
        method: "POST",
        body: form,
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Transcription failed.");
        statusText("Ready");
        setStatusMode("idle");
        return;
      }

      state.speakerSegments = Array.isArray(data.segments) ? data.segments : [];
      state.speakerMap = {};
      state.transcriptConfidence = data.confidence ?? null;

      renderSpeakerMap();
      renderSpeakerTimeline();

      const transcript = (data.transcript || "").trim();
      if (els.transcript) els.transcript.value = transcript;
      if (els.note && !els.note.value.trim()) els.note.value = transcript;
      if (els.title && !els.title.value.trim()) els.title.value = titleFrom(transcript);

      const detectedType = data.detected_meeting_type || detectMeetingTypeFromContent(transcript);
      state.detectedMeetingType = detectedType || "";
      if (els.meetingTypeBadge) {
        els.meetingTypeBadge.textContent = state.detectedMeetingType || "Not detected";
      }
      if (els.meetingFormat && !els.meetingFormat.value && state.detectedMeetingType) {
        els.meetingFormat.value = state.detectedMeetingType;
      }

      if (Array.isArray(data.flags) && data.flags.length) {
        state.intelligenceFlags = data.flags.map(text => ({ level: "warn", text }));
      } else {
        state.intelligenceFlags = [];
      }

      if (Array.isArray(data.actions)) {
        state.extractedActions = data.actions;
        renderActions();
      }

      buildIntelligenceFlags();

      markDirty();
      statusText("Transcript ready");
      setStatusMode("success");
      showToast("Transcription complete.");

      if (autoINotes && transcript) {
        await runINotes();
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert(error.name === "AbortError"
        ? "Transcription timed out."
        : "The transcription connection was lost.");
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  function getINotesInstruction() {
    const selectedMode = els.outputMode?.value || "final_note";
    const base = OUTPUT_MODE_PROMPTS[selectedMode] || OUTPUT_MODE_PROMPTS.final_note;
    const custom = (els.prompt?.value || "").trim();

    const meetingType = els.meetingFormat?.value || state.detectedMeetingType || "";
    const severity = els.incidentSeverity?.value || "";
    const flags = state.intelligenceFlags.map(x => `- ${x.text}`).join("\n");
    const structured = buildStructuredIncidentText();

    return [
      base,
      meetingType ? `Meeting type: ${meetingType}` : "",
      severity ? `Incident severity: ${severity}` : "",
      flags ? `Known flags:\n${flags}` : "",
      structured.replace(/\s/g, "") ? `Structured incident fields:\n${structured}` : "",
      custom ? `Additional instruction:\n${custom}` : ""
    ].filter(Boolean).join("\n\n");
  }

  async function applyAI(silent = false) {
    if (els.noteStatus?.value === "approved") {
      alert("Approved notes are locked.");
      return;
    }

    const sourceText = (els.note?.value || buildSpeakerAwareTranscript()).trim();
    const instruction = (els.prompt?.value || "").trim()
      || "Rewrite this as a professional children's home record. Use clear, factual, neutral language. Separate observation from interpretation. Include safeguarding awareness and ensure it is suitable for Ofsted inspection.";

    if (!sourceText) {
      alert("There is no text to improve.");
      return;
    }

    const form = new FormData();
    form.append("text", sourceText);
    form.append("mode", "custom");
    form.append("instruction", instruction);

    try {
      statusText("Applying AI...");
      setStatusMode("processing");

      const response = await fetchWithSession("/ai-notes/edit", {
        method: "POST",
        body: form
      });

      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "AI edit failed.");
        statusText("Ready");
        setStatusMode("idle");
        return;
      }

      if (els.note) els.note.value = data.text || sourceText;
      if (els.title && !els.title.value.trim()) els.title.value = titleFrom(els.note.value);

      buildIntelligenceFlags();
      markDirty();
      statusText("Note ready");
      setStatusMode("success");
      setNoteView("final");
      if (!silent) showToast("AI update applied.");
    } catch (error) {
      console.error(error);
      alert("Could not connect to AI service.");
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  async function runINotes() {
    if (els.noteStatus?.value === "approved") {
      alert("Approved notes are locked.");
      return;
    }

    const sourceText = buildSpeakerAwareTranscript() || (els.transcript?.value || "").trim() || (els.note?.value || "").trim();
    if (!sourceText) {
      alert("There is no transcript or note content to process.");
      return;
    }

    buildIntelligenceFlags();
    const instruction = getINotesInstruction();

    const form = new FormData();
    form.append("text", sourceText);
    form.append("mode", "custom");
    form.append("instruction", instruction);

    try {
      statusText("Running I-Notes...");
      setStatusMode("processing");

      const response = await fetchWithSession("/ai-notes/edit", {
        method: "POST",
        body: form
      });

      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "I-Notes processing failed.");
        statusText("Ready");
        setStatusMode("idle");
        return;
      }

      if (els.note) els.note.value = data.text || sourceText;
      if (els.title && !els.title.value.trim()) {
        els.title.value = titleFrom(els.note.value);
      }

      markDirty();
      buildIntelligenceFlags();
      setNoteView("final");
      statusText("I-Notes ready");
      setStatusMode("success");
      showToast("I-Notes output generated.");
    } catch (error) {
      console.error(error);
      alert("Could not connect to AI service.");
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  async function extractActionsFromNote() {
    const text = (els.note?.value || "").trim() || buildSpeakerAwareTranscript();
    if (!text) {
      alert("There is no note to extract actions from.");
      return;
    }

    const form = new FormData();
    form.append("text", text);

    try {
      statusText("Extracting actions...");
      setStatusMode("processing");

      const response = await fetchWithSession("/ai-notes/extract-actions", {
        method: "POST",
        body: form
      });

      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Could not extract actions.");
        statusText("Ready");
        setStatusMode("idle");
        return;
      }

      state.extractedActions = Array.isArray(data.actions) ? data.actions : [];
      renderActions();
      statusText("Note ready");
      setStatusMode("success");
      setNoteView("actions");
      showToast("Actions extracted.");
    } catch (error) {
      console.error(error);
      alert("Could not connect to action extraction service.");
      statusText("Ready");
      setStatusMode("idle");
    }
  }

  async function saveNote() {
    const transcript = (els.transcript?.value || "").trim();
    const finalNote = (els.note?.value || "").trim();
    const title = (els.title?.value || "").trim() || titleFrom(finalNote);

    if (!transcript) {
      alert("Transcript is required.");
      return;
    }

    if (!finalNote) {
      alert("Final note is required.");
      return;
    }

    const form = new FormData();
    form.append("transcript", transcript);
    form.append("ai_draft", finalNote);
    form.append("final_note", finalNote);
    form.append("title", title);
    form.append("meeting_format", els.meetingFormat?.value || "");
    form.append("template_name", els.documentTemplate?.value || "");
    form.append("note_status", els.noteStatus?.value || "draft");
    form.append("output_mode", els.outputMode?.value || "final_note");
    form.append("incident_severity", els.incidentSeverity?.value || "");
    form.append("speaker_segments_json", JSON.stringify(state.speakerSegments || []));
    form.append("speaker_map_json", JSON.stringify(state.speakerMap || {}));
    form.append("structured_incident_json", JSON.stringify({
      who: els.structuredWho?.value || "",
      what: els.structuredWhat?.value || "",
      staff_response: els.structuredStaffResponse?.value || "",
      outcome: els.structuredOutcome?.value || "",
      injury: els.structuredInjury?.value || "",
      body_location: els.structuredBodyLocation?.value || "",
      medical_attention: els.structuredMedicalAttention?.value || "",
      notifications: els.structuredNotifications?.value || "",
      follow_up: els.structuredFollowUp?.value || "",
      missing_info: els.structuredMissingInfo?.value || ""
    }));
    form.append("flags_json", JSON.stringify(state.intelligenceFlags || []));
    form.append("actions_json", JSON.stringify(state.extractedActions || []));

    if (state.noteId) form.append("note_id", String(state.noteId));

    try {
      statusText("Saving...");
      setStatusMode("processing");
      setSaveState("idle", "Saving...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetchWithSession("/ai-notes/save", {
        method: "POST",
        body: form,
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Save failed.");
        statusText("Ready");
        setStatusMode("idle");
        setSaveState("dirty", "Unsaved changes");
        return;
      }

      state.noteId = data.record?.id || data.id || state.noteId;
      statusText("Saved");
      setStatusMode("success");
      markSaved();
      showToast("Note saved.");
      await loadSavedNotes();
    } catch (error) {
      console.error("Save error:", error);
      alert(error.name === "AbortError" ? "Save timed out." : "The save connection was lost.");
      statusText("Ready");
      setStatusMode("idle");
      setSaveState("dirty", "Unsaved changes");
    }
  }

  async function loadSavedNotes() {
    try {
      const response = await fetchWithSession("/ai-notes/history");
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Could not load saved notes.");
        return;
      }

      state.saved = Array.isArray(data.notes) ? data.notes : [];
      applySearch();
    } catch (error) {
      console.error(error);
      alert("Could not load saved notes.");
    }
  }

  function applySearch() {
    const query = String(els.searchInput?.value || "").trim().toLowerCase();

    state.filtered = state.saved.filter(note => {
      const haystack = [
        note.title,
        note.transcript,
        note.final_note,
        note.note_status,
        note.meeting_format,
        note.template_name,
        note.output_mode,
        note.incident_severity
      ].join(" ").toLowerCase();

      return !query || haystack.includes(query);
    });

    renderSavedNotes();
  }

  function renderSavedNotes() {
    if (!els.list || !els.empty) return;

    els.list.innerHTML = "";
    els.empty.style.display = state.filtered.length ? "none" : "flex";

    state.filtered.forEach(note => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="saved-title">${escapeHtml(note.title || "Untitled note")}</div>
          <div class="saved-preview">${escapeHtml(notePreview(note.final_note || note.transcript || ""))}</div>
        </td>
        <td><span class="mini-badge">${escapeHtml(note.note_status || "draft")}</span></td>
        <td>${note.updated_at ? new Date(note.updated_at).toLocaleString("en-GB") : "—"}</td>
        <td>
          <div class="panel-toolbar wrap" style="margin:0;">
            <button class="btn btn-light btn-sm" data-edit="${note.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-del="${note.id}">Delete</button>
          </div>
        </td>
      `;
      els.list.appendChild(row);
    });
  }

  function loadIntoEditor(id) {
    const note = state.saved.find(item => String(item.id) === String(id));
    if (!note) return;

    state.noteId = note.id;
    state.speakerSegments = Array.isArray(note.speaker_segments) ? note.speaker_segments : [];
    state.speakerMap = note.speaker_map || {};
    state.extractedActions = Array.isArray(note.actions) ? note.actions : [];
    state.intelligenceFlags = Array.isArray(note.flags) ? note.flags : [];

    if (els.title) els.title.value = note.title || "";
    if (els.transcript) els.transcript.value = note.transcript || "";
    if (els.note) els.note.value = note.final_note || "";
    if (els.meetingFormat) els.meetingFormat.value = note.meeting_format || "";
    if (els.documentTemplate) els.documentTemplate.value = note.template_name || "blank";
    if (els.noteStatus) els.noteStatus.value = note.note_status || "draft";
    if (els.outputMode) els.outputMode.value = note.output_mode || "final_note";
    if (els.incidentSeverity) els.incidentSeverity.value = note.incident_severity || "";

    const structured = note.structured_incident || {};
    if (els.structuredWho) els.structuredWho.value = structured.who || "";
    if (els.structuredWhat) els.structuredWhat.value = structured.what || "";
    if (els.structuredStaffResponse) els.structuredStaffResponse.value = structured.staff_response || "";
    if (els.structuredOutcome) els.structuredOutcome.value = structured.outcome || "";
    if (els.structuredInjury) els.structuredInjury.value = structured.injury || "";
    if (els.structuredBodyLocation) els.structuredBodyLocation.value = structured.body_location || "";
    if (els.structuredMedicalAttention) els.structuredMedicalAttention.value = structured.medical_attention || "";
    if (els.structuredNotifications) els.structuredNotifications.value = structured.notifications || "";
    if (els.structuredFollowUp) els.structuredFollowUp.value = structured.follow_up || "";
    if (els.structuredMissingInfo) els.structuredMissingInfo.value = structured.missing_info || "";

    state.detectedMeetingType = note.meeting_format || "";
    if (els.meetingTypeBadge) els.meetingTypeBadge.textContent = state.detectedMeetingType || "Not detected";

    renderSpeakerMap();
    renderSpeakerTimeline();
    renderActions();
    renderIntelligenceFlags(state.intelligenceFlags);
    renderStructuredFlags(state.intelligenceFlags);

    setSaveState("idle", "Loaded");
    state.dirty = false;
    statusText("Editing saved note");
    setStatusMode("success");
    setActiveTab("workspace");
    setNoteView("final");
    updateLockState();
    showToast("Saved note loaded.");
  }

  async function deleteNote(id) {
    const confirmed = window.confirm("Delete this saved note?");
    if (!confirmed) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetchWithSession(`/ai-notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Delete failed.");
        return;
      }

      if (String(state.noteId) === String(id)) {
        state.noteId = null;
      }

      showToast("Note deleted.");
      await loadSavedNotes();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.name === "AbortError" ? "Delete timed out." : "The delete connection was lost.");
    }
  }

  async function loadVersions() {
    if (!state.noteId) {
      alert("Save the note first to create version history.");
      return;
    }

    try {
      const response = await fetchWithSession(`/ai-notes/history/${encodeURIComponent(state.noteId)}/versions`);
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Could not load versions.");
        return;
      }

      const versions = Array.isArray(data.versions) ? data.versions : [];
      renderVersions(versions);
      openVersionsModal();
    } catch (error) {
      console.error(error);
      alert("Could not load version history.");
    }
  }

  function renderVersions(versions) {
    if (!els.versionsList) return;
    els.versionsList.innerHTML = "";

    if (!versions.length) {
      els.versionsList.innerHTML = `<div class="speaker-empty">No versions available yet.</div>`;
      return;
    }

    versions.forEach(version => {
      const item = document.createElement("div");
      item.className = "version-item";
      item.innerHTML = `
        <div class="version-title">${escapeHtml(version.title || "Untitled note")}</div>
        <div class="version-meta">${version.created_at ? new Date(version.created_at).toLocaleString("en-GB") : "—"}</div>
        <div class="version-preview">${escapeHtml(notePreview(version.final_note || ""))}</div>
        <div class="version-actions">
          <button class="btn btn-light btn-sm" data-restore-version="${version.id}">Restore</button>
        </div>
      `;
      els.versionsList.appendChild(item);
    });
  }

  async function restoreVersion(versionId) {
    if (!state.noteId) return;

    const form = new FormData();
    form.append("version_id", String(versionId));

    try {
      const response = await fetchWithSession(`/ai-notes/history/${encodeURIComponent(state.noteId)}/restore-version`, {
        method: "POST",
        body: form
      });

      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Could not restore version.");
        return;
      }

      const restored = data.record;
      if (restored) {
        state.noteId = restored.id;
        if (els.title) els.title.value = restored.title || "";
        if (els.transcript) els.transcript.value = restored.transcript || "";
        if (els.note) els.note.value = restored.final_note || "";
        if (els.meetingFormat) els.meetingFormat.value = restored.meeting_format || "";
        if (els.documentTemplate) els.documentTemplate.value = restored.template_name || "blank";
        if (els.noteStatus) els.noteStatus.value = restored.note_status || "draft";
        if (els.outputMode) els.outputMode.value = restored.output_mode || "final_note";
        if (els.incidentSeverity) els.incidentSeverity.value = restored.incident_severity || "";
        state.speakerSegments = Array.isArray(restored.speaker_segments) ? restored.speaker_segments : [];
        state.speakerMap = restored.speaker_map || {};
        state.extractedActions = Array.isArray(restored.actions) ? restored.actions : [];
        state.intelligenceFlags = Array.isArray(restored.flags) ? restored.flags : [];
      }

      renderSpeakerMap();
      renderSpeakerTimeline();
      renderActions();
      renderIntelligenceFlags(state.intelligenceFlags);
      renderStructuredFlags(state.intelligenceFlags);
      closeVersionsModal();
      await loadSavedNotes();
      markDirty();
      updateLockState();
      setNoteView("final");
      showToast("Version restored.");
    } catch (error) {
      console.error(error);
      alert("Could not restore version.");
    }
  }

  async function exportNote(format) {
    const finalNote = (els.note?.value || "").trim();
    const title = (els.title?.value || "").trim() || "Meeting Note";

    if (!finalNote) {
      alert("There is nothing to export.");
      return;
    }

    const form = new FormData();
    form.append("title", title);
    form.append("final_note", finalNote);
    form.append("template_name", els.documentTemplate?.value || "");

    try {
      const response = await fetchWithSession(`/ai-notes/export/${format}`, {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        const data = await safeJson(response);
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        alert(data.detail || "Export failed.");
        return;
      }

      const blob = await response.blob();
      downloadBlob(blob, `${title}.${format}`);
      showToast(`Exported ${format.toUpperCase()}.`);
    } catch (error) {
      console.error(error);
      alert("Could not export note.");
    }
  }

  function printNote() {
    const title = (els.title?.value || "").trim() || "Meeting Note";
    const content = (els.note?.value || "").trim();

    if (!content) {
      alert("There is nothing to print.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Print window was blocked.");
      return;
    }

    printWindow.document.write(`
      <html lang="en-GB">
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #111827; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <pre>${escapeHtml(content)}</pre>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function resetFromTranscript() {
    const transcript = buildSpeakerAwareTranscript() || (els.transcript?.value || "").trim();
    if (!transcript) {
      alert("There is no transcript to restore.");
      return;
    }
    if (!window.confirm("Replace the current note with the transcript?")) return;

    if (els.note) els.note.value = transcript;
    markDirty();
    statusText("Note reset");
    setStatusMode("success");
    setNoteView("final");
    showToast("Note reset from transcript.");
  }

  function clearEditor() {
    const confirmed = window.confirm("Clear the current note?");
    if (!confirmed) return;

    state.noteId = null;
    state.blob = null;
    state.speakerSegments = [];
    state.speakerMap = {};
    state.extractedActions = [];
    state.intelligenceFlags = [];
    state.detectedMeetingType = "";
    state.transcriptConfidence = null;

    if (els.title) els.title.value = "";
    if (els.prompt) els.prompt.value = "";
    if (els.transcript) els.transcript.value = "";
    if (els.note) els.note.value = "";
    if (els.meetingFormat) els.meetingFormat.value = "";
    if (els.documentTemplate) els.documentTemplate.value = "blank";
    if (els.noteStatus) els.noteStatus.value = "draft";
    if (els.outputMode) els.outputMode.value = "final_note";
    if (els.incidentSeverity) els.incidentSeverity.value = "";
    if (els.transcribeBtn) els.transcribeBtn.disabled = true;
    if (els.audio) els.audio.removeAttribute("src");

    [
      els.structuredWho,
      els.structuredWhat,
      els.structuredStaffResponse,
      els.structuredOutcome,
      els.structuredInjury,
      els.structuredFollowUp,
      els.structuredBodyLocation,
      els.structuredMedicalAttention,
      els.structuredNotifications,
      els.structuredMissingInfo
    ].forEach(el => {
      if (el) el.value = "";
    });

    if (els.meetingTypeBadge) els.meetingTypeBadge.textContent = "Not detected";

    renderSpeakerMap();
    renderSpeakerTimeline();
    renderActions();
    renderIntelligenceFlags([]);
    renderStructuredFlags([]);

    state.dirty = false;
    statusText("Ready");
    setStatusMode("idle");
    setSaveState("idle", "Not saved");
    updateLockState();
    showToast("Editor cleared.");
  }

  function useTranscriptForAi() {
    if (els.noteStatus?.value === "approved") {
      alert("Approved notes are locked.");
      return;
    }

    const transcript = buildSpeakerAwareTranscript() || (els.transcript?.value || "").trim();
    if (!transcript) {
      alert("There is no transcript available.");
      return;
    }
    if (els.note) els.note.value = transcript;
    markDirty();
    setNoteView("final");
    showToast("Transcript copied into final note.");
  }

  function buildStructuredIntoNote() {
    const structuredText = buildStructuredIncidentText();
    if (!structuredText.replace(/\s/g, "")) {
      alert("There is no structured incident content yet.");
      return;
    }
    if (els.note) els.note.value = structuredText;
    buildIntelligenceFlags();
    markDirty();
    setNoteView("final");
    showToast("Structured incident copied into final note.");
  }

  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function buildRecognition() {
    const SR = getSpeechRecognition();
    if (!SR) {
      alert("Speech recognition is not supported on this device/browser.");
      return null;
    }

    const recognition = new SR();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.continuous = false;
    return recognition;
  }

  function insertAtCursor(textarea, text) {
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);

    const needsGapBefore = before && !before.endsWith("\n") && !before.endsWith(" ");
    const prefix = needsGapBefore ? "\n" : "";

    textarea.value = `${before}${prefix}${text}${after}`;
    const newPos = before.length + prefix.length + text.length;
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;
    textarea.focus();
  }

  async function startVoicePromptCapture() {
    if (els.noteStatus?.value === "approved") {
      alert("Approved notes are locked.");
      return;
    }

    const recognition = buildRecognition();
    if (!recognition) return;

    let finalText = "";
    let heardAnything = false;

    statusText("Listening for instruction...");
    setStatusMode("processing");

    if (els.voicePromptBtn) {
      els.voicePromptBtn.disabled = true;
      els.voicePromptBtn.textContent = "Listening...";
    }

    recognition.onresult = event => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
        if (event.results[i].isFinal) heardAnything = true;
      }

      finalText = transcript.trim();
      if (els.prompt) els.prompt.value = finalText;
    };

    recognition.onerror = () => {
      statusText("Ready");
      setStatusMode("idle");
      if (els.voicePromptBtn) {
        els.voicePromptBtn.disabled = false;
        els.voicePromptBtn.textContent = "Talk to IndiCare";
      }
      showToast("Voice instruction failed.");
    };

    recognition.onend = async () => {
      statusText("Ready");
      setStatusMode("idle");

      if (els.voicePromptBtn) {
        els.voicePromptBtn.disabled = false;
        els.voicePromptBtn.textContent = "Talk to IndiCare";
      }

      if (heardAnything && finalText.trim()) {
        showToast("Instruction captured.");
        markDirty();
        await applyAI(false);
      }
    };

    recognition.start();
  }

  function startDictationIntoNote() {
    if (els.noteStatus?.value === "approved") {
      alert("Approved notes are locked.");
      return;
    }

    const recognition = buildRecognition();
    if (!recognition) return;

    let finalText = "";
    let heardAnything = false;

    statusText("Dictating into final note...");
    setStatusMode("processing");

    if (els.dictateNoteBtn) {
      els.dictateNoteBtn.disabled = true;
      els.dictateNoteBtn.textContent = "Listening...";
    }

    recognition.onresult = event => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
        if (event.results[i].isFinal) heardAnything = true;
      }

      finalText = transcript.trim();
    };

    recognition.onerror = () => {
      statusText("Ready");
      setStatusMode("idle");
      if (els.dictateNoteBtn) {
        els.dictateNoteBtn.disabled = false;
        els.dictateNoteBtn.textContent = "Dictate Note";
      }
      showToast("Dictation failed.");
    };

    recognition.onend = () => {
      statusText("Ready");
      setStatusMode("idle");

      if (els.dictateNoteBtn) {
        els.dictateNoteBtn.disabled = false;
        els.dictateNoteBtn.textContent = "Dictate Note";
      }

      if (heardAnything && finalText.trim()) {
        insertAtCursor(els.note, finalText.trim());
        markDirty();
        buildIntelligenceFlags();
        setNoteView("final");
        showToast("Dictation added to final note.");
      }
    };

    recognition.start();
  }

  function bindPromptButtons() {
    document.querySelectorAll("[data-fill]").forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-fill") || "";
        if (els.prompt) els.prompt.value = value;
        markDirty();
        setNoteView("final");
      });
    });

    document.querySelectorAll(".output-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-output-mode") || "final_note";
        if (els.outputMode) els.outputMode.value = mode;
        markDirty();
        runINotes();
      });
    });
  }

  function bindDirtyTracking() {
    [
      els.title,
      els.prompt,
      els.transcript,
      els.note,
      els.meetingFormat,
      els.noteStatus,
      els.documentTemplate,
      els.outputMode,
      els.incidentSeverity,
      els.structuredWho,
      els.structuredWhat,
      els.structuredStaffResponse,
      els.structuredOutcome,
      els.structuredInjury,
      els.structuredFollowUp,
      els.structuredBodyLocation,
      els.structuredMedicalAttention,
      els.structuredNotifications,
      els.structuredMissingInfo
    ].forEach(el => {
      el?.addEventListener("input", () => {
        markDirty();
        buildIntelligenceFlags();
      });
      el?.addEventListener("change", () => {
        markDirty();
        buildIntelligenceFlags();
        if (el === els.noteStatus) updateLockState();
      });
    });
  }

  function bindSpeakerMapInputs() {
    els.speakerMapList?.addEventListener("input", event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const key = target.getAttribute("data-speaker-key");
      if (!key) return;
      state.speakerMap[key] = target.value.trim();
      renderSpeakerTimeline();
      markDirty();
    });
  }

  function bindViewSwitcher() {
    els.viewFinalBtn?.addEventListener("click", () => setNoteView("final"));
    els.viewSourceBtn?.addEventListener("click", () => setNoteView("source"));
    els.viewActionsBtn?.addEventListener("click", () => setNoteView("actions"));
    els.viewStructuredBtn?.addEventListener("click", () => setNoteView("structured"));
  }

  function bindEvents() {
    els.recordBtn?.addEventListener("click", startRecording);
    els.recordBtnSidebar?.addEventListener("click", startRecording);

    els.pauseBtn?.addEventListener("click", pauseRecording);
    els.resumeBtn?.addEventListener("click", resumeRecording);
    els.cancelBtn?.addEventListener("click", cancelRecording);
    els.stopBtn?.addEventListener("click", stopRecording);

    els.workspaceTabBtn?.addEventListener("click", () => setActiveTab("workspace"));
    els.savedTabBtn?.addEventListener("click", () => setActiveTab("saved"));

    els.transcribeBtn?.addEventListener("click", () => transcribeAudio(false));
    els.renameSpeakersBtn?.addEventListener("click", () => {
      renderSpeakerMap();
      renderSpeakerTimeline();
      showToast("Speaker view refreshed.");
    });

    els.extractActionsBtn?.addEventListener("click", extractActionsFromNote);
    els.extractActionsBtnInline?.addEventListener("click", extractActionsFromNote);

    els.useTranscriptForAiBtn?.addEventListener("click", useTranscriptForAi);
    els.copyTranscriptBtn?.addEventListener("click", useTranscriptForAi);
    els.buildStructuredIntoNoteBtn?.addEventListener("click", buildStructuredIntoNote);

    els.aiBtn?.addEventListener("click", () => applyAI(false));
    els.runINotesBtn?.addEventListener("click", runINotes);
    els.voicePromptBtn?.addEventListener("click", startVoicePromptCapture);
    els.dictateNoteBtn?.addEventListener("click", startDictationIntoNote);

    els.saveBtn?.addEventListener("click", saveNote);
    els.refreshBtn?.addEventListener("click", loadSavedNotes);
    els.pdfBtn?.addEventListener("click", () => exportNote("pdf"));
    els.docxBtn?.addEventListener("click", () => exportNote("docx"));
    els.printBtn?.addEventListener("click", printNote);
    els.resetBtn?.addEventListener("click", resetFromTranscript);
    els.clearBtn?.addEventListener("click", clearEditor);
    els.versionsBtn?.addEventListener("click", loadVersions);
    els.closeVersionsBtn?.addEventListener("click", closeVersionsModal);
    els.searchInput?.addEventListener("input", applySearch);

    els.list?.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const editId = target.getAttribute("data-edit");
      const delId = target.getAttribute("data-del");
      if (editId) loadIntoEditor(editId);
      if (delId) deleteNote(delId);
    });

    els.versionsList?.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const versionId = target.getAttribute("data-restore-version");
      if (versionId) restoreVersion(versionId);
    });

    bindPromptButtons();
    bindDirtyTracking();
    bindSpeakerMapInputs();
    bindViewSwitcher();

    window.addEventListener("beforeunload", event => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  async function init() {
    const ok = await verifyAuth();
    if (!ok) return;

    bindEvents();
    renderSpeakerMap();
    renderSpeakerTimeline();
    renderActions();
    renderIntelligenceFlags([]);
    renderStructuredFlags([]);
    setActiveTab("workspace");
    setNoteView("final");
    statusText("Ready");
    setStatusMode("idle");
    setSaveState("idle", "Not saved");
    updateLockState();
    await loadSavedNotes();
  }

  init();
});
