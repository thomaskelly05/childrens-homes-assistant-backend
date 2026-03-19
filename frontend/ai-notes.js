document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const els = {
    recordBtn: $("recordBtn"),
    transcribeBtn: $("transcribeBtn"),
    aiBtn: $("aiBtn"),
    saveBtn: $("saveBtn"),
    printBtn: $("printBtn"),
    pdfBtn: $("pdfBtn"),
    docxBtn: $("docxBtn"),
    clearBtn: $("clearBtn"),
    resetBtn: $("resetBtn"),
    refreshBtn: $("refreshBtn"),
    searchInput: $("searchInput"),

    workspaceTabBtn: $("workspaceTabBtn"),
    savedTabBtn: $("savedTabBtn"),
    workspacePanel: $("workspacePanel"),
    savedPanel: $("savedPanel"),

    title: $("title"),
    prompt: $("prompt"),
    transcript: $("transcript"),
    note: $("note"),

    status: $("status"),
    saveState: $("saveState"),
    list: $("list"),
    empty: $("empty"),

    modal: $("modal"),
    timer: $("timer"),
    recState: $("recState"),
    mic: $("mic"),
    pauseBtn: $("pauseBtn"),
    resumeBtn: $("resumeBtn"),
    cancelBtn: $("cancelBtn"),
    stopBtn: $("stopBtn"),

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
    dirty: false
  };

  const token = () => localStorage.getItem("access_token") || "";

  const headers = (extra = {}) =>
    token() ? { ...extra, Authorization: `Bearer ${token()}` } : { ...extra };

  const showToast = message => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
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
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  };

  const statusText = value => {
    if (els.status) els.status.textContent = value;
  };

  const setSaveState = (mode, text) => {
    if (!els.saveState) return;
    els.saveState.className = `save-badge ${mode}`;
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
    return clean.length > 100 ? `${clean.slice(0, 100)}…` : clean;
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

  async function verifyAuth() {
    if (!token()) {
      redirectToLogin();
      return false;
    }

    try {
      const response = await fetch("/auth/me", { headers: headers() });
      const data = await safeJson(response);

      if (!response.ok) {
        if (response.status === 401) {
          redirectToLogin();
          return false;
        }
        if (response.status === 403) {
          alert(data.detail || "Subscription required");
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

  function setActiveTab(tab) {
    const workspace = tab === "workspace";
    els.workspaceTabBtn?.classList.toggle("active", workspace);
    els.savedTabBtn?.classList.toggle("active", !workspace);
    els.workspacePanel?.classList.toggle("active", workspace);
    els.savedPanel?.classList.toggle("active", !workspace);
  }

  function openModal() {
    els.modal?.classList.remove("hide");
  }

  function closeModal() {
    els.modal?.classList.add("hide");
    els.mic?.classList.remove("paused");
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
    } catch (error) {
      console.error(error);
      alert("Unable to access microphone.");
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

  async function transcribeAudio(autoAi = false) {
    if (!state.blob) {
      alert("Please record audio first.");
      return;
    }

    const form = new FormData();
    form.append("file", state.blob, `meeting-note.${state.recordingExtension}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch("/ai-notes/transcribe", {
        method: "POST",
        headers: headers(),
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
        return;
      }

      const transcript = (data.transcript || "").trim();
      if (els.transcript) els.transcript.value = transcript;
      if (els.note && !els.note.value.trim()) els.note.value = transcript;
      if (els.title && !els.title.value.trim()) els.title.value = titleFrom(transcript);

      markDirty();
      statusText("Transcript ready");
      showToast("Transcription complete.");

      if (autoAi && transcript) {
        await applyAI(true);
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert(error.name === "AbortError"
        ? "Transcription timed out."
        : "The transcription connection was lost.");
      statusText("Ready");
    }
  }

  async function applyAI(silent = false) {
    const sourceText = (els.note?.value || els.transcript?.value || "").trim();
    const instruction = (els.prompt?.value || "").trim()
      || "Turn this into a professional meeting note using clear, factual language.";

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

      const response = await fetch("/ai-notes/edit", {
        method: "POST",
        headers: headers(),
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
        return;
      }

      if (els.note) els.note.value = data.text || sourceText;
      if (els.title && !els.title.value.trim()) els.title.value = titleFrom(els.note.value);

      markDirty();
      statusText("Note ready");
      if (!silent) showToast("AI update applied.");
    } catch (error) {
      console.error(error);
      alert("Could not connect to AI service.");
      statusText("Ready");
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
      alert("Note is required.");
      return;
    }

    const form = new FormData();
    form.append("transcript", transcript);
    form.append("ai_draft", finalNote);
    form.append("final_note", finalNote);
    form.append("title", title);

    if (state.noteId) form.append("note_id", String(state.noteId));

    try {
      statusText("Saving...");
      setSaveState("idle", "Saving...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/ai-notes/save", {
        method: "POST",
        headers: headers(),
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
        setSaveState("dirty", "Unsaved changes");
        return;
      }

      state.noteId = data.record?.id || data.id || state.noteId;
      statusText("Saved");
      markSaved();
      showToast("Note saved.");
      await loadSavedNotes();
    } catch (error) {
      console.error("Save error:", error);
      alert(error.name === "AbortError"
        ? "Save timed out."
        : "The save connection was lost.");
      statusText("Ready");
      setSaveState("dirty", "Unsaved changes");
    }
  }

  async function loadSavedNotes() {
    try {
      const response = await fetch("/ai-notes/history", { headers: headers() });
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
        note.final_note
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
        <td>${note.updated_at ? new Date(note.updated_at).toLocaleString("en-GB") : "—"}</td>
        <td>
          <div class="panel-toolbar wrap">
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
    if (els.title) els.title.value = note.title || "";
    if (els.transcript) els.transcript.value = note.transcript || "";
    if (els.note) els.note.value = note.final_note || "";

    setSaveState("idle", "Loaded");
    state.dirty = false;
    statusText("Editing saved note");
    setActiveTab("workspace");
    showToast("Saved note loaded.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteNote(id) {
    const confirmed = window.confirm("Delete this saved note?");
    if (!confirmed) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`/ai-notes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: headers(),
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
      alert(error.name === "AbortError"
        ? "Delete timed out."
        : "The delete connection was lost.");
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
    form.append("template_name", "Meeting note");

    try {
      const response = await fetch(`/ai-notes/export/${format}`, {
        method: "POST",
        headers: headers(),
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
    const transcript = (els.transcript?.value || "").trim();
    if (!transcript) {
      alert("There is no transcript to restore.");
      return;
    }
    if (!window.confirm("Replace the current note with the transcript?")) return;

    if (els.note) els.note.value = transcript;
    markDirty();
    statusText("Note reset");
    showToast("Note reset from transcript.");
  }

  function clearEditor() {
    const confirmed = window.confirm("Clear the current note?");
    if (!confirmed) return;

    state.noteId = null;
    state.blob = null;
    if (els.title) els.title.value = "";
    if (els.prompt) els.prompt.value = "";
    if (els.transcript) els.transcript.value = "";
    if (els.note) els.note.value = "";

    state.dirty = false;
    statusText("Ready");
    setSaveState("idle", "Not saved");
    showToast("Editor cleared.");
  }

  function bindPromptButtons() {
    document.querySelectorAll("[data-fill]").forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-fill") || "";
        if (els.prompt) els.prompt.value = value;
      });
    });
  }

  function bindDirtyTracking() {
    [els.title, els.prompt, els.transcript, els.note].forEach(el => {
      el?.addEventListener("input", markDirty);
    });
  }

  function bindEvents() {
    els.recordBtn?.addEventListener("click", startRecording);
    els.pauseBtn?.addEventListener("click", pauseRecording);
    els.resumeBtn?.addEventListener("click", resumeRecording);
    els.cancelBtn?.addEventListener("click", cancelRecording);
    els.stopBtn?.addEventListener("click", stopRecording);

    els.workspaceTabBtn?.addEventListener("click", () => setActiveTab("workspace"));
    els.savedTabBtn?.addEventListener("click", () => setActiveTab("saved"));

    els.transcribeBtn?.addEventListener("click", () => transcribeAudio(false));
    els.aiBtn?.addEventListener("click", () => applyAI(false));
    els.saveBtn?.addEventListener("click", saveNote);
    els.refreshBtn?.addEventListener("click", loadSavedNotes);
    els.pdfBtn?.addEventListener("click", () => exportNote("pdf"));
    els.docxBtn?.addEventListener("click", () => exportNote("docx"));
    els.printBtn?.addEventListener("click", printNote);
    els.resetBtn?.addEventListener("click", resetFromTranscript);
    els.clearBtn?.addEventListener("click", clearEditor);
    els.searchInput?.addEventListener("input", applySearch);

    els.list?.addEventListener("click", event => {
      const editId = event.target.getAttribute("data-edit");
      const delId = event.target.getAttribute("data-del");
      if (editId) loadIntoEditor(editId);
      if (delId) deleteNote(delId);
    });

    bindPromptButtons();
    bindDirtyTracking();

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
    setActiveTab("workspace");
    statusText("Ready");
    setSaveState("idle", "Not saved");
    await loadSavedNotes();
  }

  init();
});
