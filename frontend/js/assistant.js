window.initAssistantMeetingModal = function () {
  const API_BASE = "https://childrens-homes-assistant-backend-new.onrender.com";

  const modalOverlay = document.getElementById("aiMeetingModalOverlay");
  const openModalBtn = document.getElementById("openAiMeetingModal");
  const closeModalBtn = document.getElementById("closeAiMeetingModal");

  const transcriptEl = document.getElementById("transcript");
  const aiDraftEl = document.getElementById("aiDraft");
  const finalNoteEl = document.getElementById("finalNote");
  const aiInstructionEl = document.getElementById("aiInstruction");

  const safeguardingBoxEl = document.getElementById("safeguardingBox");
  const safeguardingTextEl = document.getElementById("safeguardingText");

  const recordingStatusEl = document.getElementById("recordingStatus");
  const recordingTimerEl = document.getElementById("recordingTimer");
  const audioReadyTextEl = document.getElementById("audioReadyText");
  const audioPlaybackEl = document.getElementById("audioPlayback");
  const micCircleEl = document.getElementById("micCircle");
  const toastEl = document.getElementById("toast");

  const startRecordingBtn = document.getElementById("startRecordingBtn");
  const stopRecordingBtn = document.getElementById("stopRecordingBtn");
  const saveBtn = document.getElementById("saveBtn");
  const deleteMeetingBtn = document.getElementById("deleteMeetingBtn");
  const copyBtn = document.getElementById("copyBtn");
  const printBtn = document.getElementById("printBtn");
  const exportTxtBtn = document.getElementById("exportTxtBtn");
  const clearTranscriptBtn = document.getElementById("clearTranscriptBtn");

  const improveBtn = document.getElementById("improveBtn");
  const shortenBtn = document.getElementById("shortenBtn");
  const formalBtn = document.getElementById("formalBtn");
  const bulletBtn = document.getElementById("bulletBtn");
  const grammarBtn = document.getElementById("grammarBtn");
  const applyAiInstructionBtn = document.getElementById("applyAiInstructionBtn");

  const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
  const historyEmptyEl = document.getElementById("historyEmpty");
  const meetingHistoryListEl = document.getElementById("meetingHistoryList");

  if (!modalOverlay || !openModalBtn) return;

  let mediaRecorder = null;
  let recordingStream = null;
  let recordedChunks = [];
  let recordedBlob = null;
  let recordedMimeType = "";
  let recordedExtension = "webm";
  let timerInterval = null;
  let recordingSeconds = 0;
  let currentSavedNoteId = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function safeText(value) {
    return (value || "").trim();
  }

  function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return value;
    }
  }

  function startTimer() {
    stopTimer();
    recordingSeconds = 0;
    if (recordingTimerEl) recordingTimerEl.textContent = "00:00";

    timerInterval = setInterval(() => {
      recordingSeconds += 1;
      if (recordingTimerEl) {
        recordingTimerEl.textContent = formatTime(recordingSeconds);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function stopStreamTracks() {
    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
      recordingStream = null;
    }
  }

  function setRecordingUI(isRecording) {
    if (!recordingStatusEl || !micCircleEl || !startRecordingBtn || !stopRecordingBtn) return;

    if (isRecording) {
      recordingStatusEl.textContent = "Recording live";
      recordingStatusEl.className = "status-pill recording";
      micCircleEl.classList.add("recording");
      startRecordingBtn.disabled = true;
      stopRecordingBtn.disabled = false;
    } else {
      recordingStatusEl.textContent = "Not recording";
      recordingStatusEl.className = "status-pill idle";
      micCircleEl.classList.remove("recording");
      startRecordingBtn.disabled = false;
      stopRecordingBtn.disabled = true;
    }
  }

  function setBusy(message) {
    if (audioReadyTextEl) {
      audioReadyTextEl.textContent = message;
    }
  }

  function openModal() {
    modalOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    loadMeetingHistory();
  }

  function closeModal() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    stopTimer();
    stopStreamTracks();
    setRecordingUI(false);
    modalOverlay.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function resetMeetingState() {
    currentSavedNoteId = null;

    if (transcriptEl) transcriptEl.value = "";
    if (aiDraftEl) aiDraftEl.value = "";
    if (finalNoteEl) finalNoteEl.value = "";
    if (aiInstructionEl) aiInstructionEl.value = "";

    if (safeguardingBoxEl) safeguardingBoxEl.style.display = "none";
    if (safeguardingTextEl) safeguardingTextEl.textContent = "";

    if (audioPlaybackEl) {
      audioPlaybackEl.pause();
      audioPlaybackEl.removeAttribute("src");
      audioPlaybackEl.load();
      audioPlaybackEl.style.display = "none";
    }

    if (audioReadyTextEl) {
      audioReadyTextEl.textContent = "Press start recording. When you stop, the transcript and report will be generated automatically.";
    }

    recordedBlob = null;
    recordedChunks = [];
    recordedMimeType = "";
    recordedExtension = "webm";

    stopTimer();
    stopStreamTracks();
    recordingSeconds = 0;

    if (recordingTimerEl) recordingTimerEl.textContent = "00:00";
    setRecordingUI(false);

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  }

  async function safeJson(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { detail: text || "Invalid server response" };
    }
  }

  function extractTitle(note) {
    const finalText = safeText(note.final_note);
    const match = finalText.match(/Meeting Title:\s*(.*)/i);
    if (match && match[1]) return match[1].trim() || "Untitled meeting";
    return "Untitled meeting";
  }

  function extractPreview(note) {
    const text = safeText(note.final_note || note.ai_draft || "");
    return text.length > 140 ? `${text.slice(0, 140)}...` : text;
  }

  function renderMeetingHistory(notes) {
    if (!meetingHistoryListEl || !historyEmptyEl) return;

    meetingHistoryListEl.innerHTML = "";

    if (!notes || notes.length === 0) {
      historyEmptyEl.style.display = "block";
      return;
    }

    historyEmptyEl.style.display = "none";

    notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = "meeting-history-item";

      item.innerHTML = `
        <div class="meeting-history-title">${extractTitle(note)}</div>
        <div class="meeting-history-meta">${formatDate(note.created_at)}</div>
        <div class="meeting-history-preview">${extractPreview(note)}</div>
        <div class="meeting-history-actions">
          <button class="btn btn-light" data-action="open" data-id="${note.id}">Open</button>
          <button class="btn btn-danger" data-action="delete" data-id="${note.id}">Delete</button>
        </div>
      `;

      meetingHistoryListEl.appendChild(item);
    });

    meetingHistoryListEl.querySelectorAll('button[data-action="open"]').forEach((btn) => {
      btn.onclick = () => openSavedMeeting(Number(btn.dataset.id));
    });

    meetingHistoryListEl.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.onclick = () => deleteSavedMeeting(Number(btn.dataset.id));
    });
  }

  async function loadMeetingHistory() {
    try {
      const response = await fetch(`${API_BASE}/ai-notes/history?limit=30`, {
        credentials: "include"
      });

      const data = await safeJson(response);

      if (!response.ok) {
        console.error(data.detail || "Could not load history");
        return;
      }

      renderMeetingHistory(data.notes || []);
    } catch (error) {
      console.error("History load error:", error);
    }
  }

  async function openSavedMeeting(noteId) {
    try {
      const response = await fetch(`${API_BASE}/ai-notes/history/${noteId}`, {
        credentials: "include"
      });

      const data = await safeJson(response);

      if (!response.ok) {
        alert(data.detail || "Could not load saved meeting.");
        return;
      }

      const note = data.note;
      currentSavedNoteId = note.id;

      if (transcriptEl) transcriptEl.value = note.transcript || "";
      if (aiDraftEl) aiDraftEl.value = note.ai_draft || "";
      if (finalNoteEl) finalNoteEl.value = note.final_note || "";

      if (safeguardingBoxEl) safeguardingBoxEl.style.display = "block";
      if (safeguardingTextEl) {
        safeguardingTextEl.textContent = `Loaded saved meeting from ${formatDate(note.created_at)}.`;
      }

      setBusy("Loaded saved meeting. You can edit the final document directly or ask the AI editing agent to refine it.");
      showToast("Saved meeting opened");
    } catch (error) {
      console.error("Open history item error:", error);
      alert("Could not load the saved meeting.");
    }
  }

  async function deleteSavedMeeting(noteId) {
    const confirmed = window.confirm("Delete this saved meeting note?");
    if (!confirmed) return;

    const form = new FormData();
    form.append("note_id", String(noteId));

    try {
      const response = await fetch(`${API_BASE}/ai-notes/delete`, {
        method: "POST",
        body: form,
        credentials: "include"
      });

      const data = await safeJson(response);

      if (!response.ok) {
        alert(data.detail || "Delete failed.");
        return;
      }

      if (currentSavedNoteId === noteId) {
        resetMeetingState();
      }

      showToast("Saved meeting deleted");
      loadMeetingHistory();
    } catch (error) {
      console.error("Delete saved meeting error:", error);
      alert("Could not delete the saved meeting.");
    }
  }

  function pickBestMimeType() {
    const candidates = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];

    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "";
  }

  function extensionFromMimeType(mimeType) {
    if (!mimeType) return "webm";
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("webm")) return "webm";
    return "webm";
  }

  async function startRecording() {
    try {
      recordedChunks = [];
      recordedBlob = null;
      currentSavedNoteId = null;

      if (audioPlaybackEl) {
        audioPlaybackEl.pause();
        audioPlaybackEl.removeAttribute("src");
        audioPlaybackEl.load();
        audioPlaybackEl.style.display = "none";
      }

      setBusy("Recording in progress...");

      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const preferredMimeType = pickBestMimeType();
      mediaRecorder = preferredMimeType
        ? new MediaRecorder(recordingStream, { mimeType: preferredMimeType })
        : new MediaRecorder(recordingStream);

      recordedMimeType = mediaRecorder.mimeType || preferredMimeType || "audio/webm";
      recordedExtension = extensionFromMimeType(recordedMimeType);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        recordedBlob = new Blob(recordedChunks, { type: recordedMimeType });

        if (audioPlaybackEl) {
          const audioUrl = URL.createObjectURL(recordedBlob);
          audioPlaybackEl.src = audioUrl;
          audioPlaybackEl.style.display = "block";
        }

        stopStreamTracks();

        setBusy(`Recording stopped. Generating transcript and report automatically...`);
        await processRecordingAutomatically();
      };

      mediaRecorder.start();
      startTimer();
      setRecordingUI(true);
      showToast("Recording started");
    } catch (error) {
      console.error("Microphone error:", error);
      alert("Unable to access the microphone. Please allow microphone access in your browser.");
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    stopTimer();
    setRecordingUI(false);
    showToast("Recording stopped");
  }

  async function transcribeAudioBlob() {
    if (!recordedBlob) {
      throw new Error("No recording available");
    }

    const filename = `meeting.${recordedExtension}`;
    const form = new FormData();
    form.append("file", recordedBlob, filename);

    const response = await fetch(`${API_BASE}/ai-notes/transcribe`, {
      method: "POST",
      body: form,
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.detail || "Transcription failed.");
    }

    if (transcriptEl) {
      transcriptEl.value = data.transcript || "";
    }

    return data.transcript || "";
  }

  async function generateTemplateFromTranscript(transcript) {
    const cleanTranscript = safeText(transcript || transcriptEl?.value);

    if (!cleanTranscript) {
      throw new Error("Transcript required.");
    }

    const form = new FormData();
    form.append("transcript", cleanTranscript);

    const response = await fetch(`${API_BASE}/ai-notes/generate`, {
      method: "POST",
      body: form,
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.detail || "Template generation failed.");
    }

    if (aiDraftEl) aiDraftEl.value = data.note || "";
    if (finalNoteEl) finalNoteEl.value = data.note || "";

    if (safeguardingBoxEl) safeguardingBoxEl.style.display = "block";
    if (safeguardingTextEl) {
      safeguardingTextEl.textContent = "Report generated automatically. Review or use the AI editing agent to refine it.";
    }

    return data.note || "";
  }

  async function processRecordingAutomatically() {
    try {
      setBusy("Transcribing recording...");
      const transcript = await transcribeAudioBlob();
      showToast("Transcript created");

      setBusy("Generating report...");
      await generateTemplateFromTranscript(transcript);
      showToast("Report generated");

      setBusy("Report ready. You can edit it directly or use the AI editing agent.");
    } catch (error) {
      console.error("Automatic processing error:", error);
      alert(error.message || "Could not process the recording.");
      setBusy("Processing failed. Please try again.");
    }
  }

  async function aiEdit(mode, instructionOverride = "") {
    const text = safeText(finalNoteEl?.value);

    if (!text) {
      alert("There is no final document to edit.");
      return;
    }

    let modeToUse = mode;
    let instruction = "";

    if (mode === "custom") {
      instruction = safeText(instructionOverride || aiInstructionEl?.value);
      if (!instruction) {
        alert("Please type an instruction for the AI editing agent.");
        return;
      }
      modeToUse = "improve";
    }

    const form = new FormData();
    form.append("text", text);
    form.append("mode", modeToUse);
    if (instruction) {
      form.append("instruction", instruction);
    }

    try {
      if (applyAiInstructionBtn && mode === "custom") {
        applyAiInstructionBtn.disabled = true;
        applyAiInstructionBtn.textContent = "Applying...";
      }

      const response = await fetch(`${API_BASE}/ai-notes/edit`, {
        method: "POST",
        body: form,
        credentials: "include"
      });

      const data = await safeJson(response);

      if (!response.ok) {
        alert(data.detail || "AI edit failed.");
        return;
      }

      if (finalNoteEl) {
        finalNoteEl.value = data.text || text;
      }

      showToast("Document updated");
    } catch (error) {
      console.error("AI edit error:", error);
      alert("Could not connect to the AI editing service.");
    } finally {
      if (applyAiInstructionBtn && mode === "custom") {
        applyAiInstructionBtn.disabled = false;
        applyAiInstructionBtn.textContent = "Apply AI edit";
      }
    }
  }

  async function saveMeetingNote() {
    const transcript = safeText(transcriptEl?.value);
    const aiDraft = safeText(aiDraftEl?.value) || safeText(finalNoteEl?.value);
    const finalNote = safeText(finalNoteEl?.value);

    if (!transcript || !finalNote) {
      alert("Transcript and final document are required before saving.");
      return;
    }

    const form = new FormData();
    form.append("transcript", transcript);
    form.append("ai_draft", aiDraft);
    form.append("final_note", finalNote);

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }

      const response = await fetch(`${API_BASE}/ai-notes/save`, {
        method: "POST",
        body: form,
        credentials: "include"
      });

      const data = await safeJson(response);

      if (!response.ok) {
        alert(data.detail || "Save failed.");
        return;
      }

      currentSavedNoteId = data.record?.id || null;
      showToast("Meeting note saved");
      loadMeetingHistory();
    } catch (error) {
      console.error("Save error:", error);
      alert("Could not connect to the meeting assistant service.");
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save";
      }
    }
  }

  async function deleteMeeting() {
    if (currentSavedNoteId) {
      await deleteSavedMeeting(currentSavedNoteId);
      return;
    }

    const confirmed = window.confirm("Delete this meeting draft from the screen?");
    if (!confirmed) return;

    try {
      await fetch(`${API_BASE}/ai-notes/delete`, {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Delete error:", error);
    }

    resetMeetingState();
    showToast("Meeting cleared");
  }

  async function copyFinalDocument() {
    const text = safeText(finalNoteEl?.value);
    if (!text) {
      alert("There is no final document to copy.");
      return;
    }

    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  }

  function printFinalDocument() {
    const text = safeText(finalNoteEl?.value);
    if (!text) {
      alert("There is no final document to print.");
      return;
    }

    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Meeting Note</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.6; }
          </style>
        </head>
        <body>${escaped}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }

  function exportFinalDocumentTxt() {
    const text = safeText(finalNoteEl?.value);
    if (!text) {
      alert("There is no final document to export.");
      return;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "meeting-note.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Text file exported");
  }

  function clearTranscript() {
    if (transcriptEl) {
      transcriptEl.value = "";
    }
    showToast("Transcript cleared");
  }

  openModalBtn.onclick = openModal;
  if (closeModalBtn) closeModalBtn.onclick = closeModal;

  modalOverlay.onclick = (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  };

  if (refreshHistoryBtn) refreshHistoryBtn.onclick = loadMeetingHistory;

  if (startRecordingBtn) startRecordingBtn.onclick = startRecording;
  if (stopRecordingBtn) stopRecordingBtn.onclick = stopRecording;
  if (saveBtn) saveBtn.onclick = saveMeetingNote;
  if (deleteMeetingBtn) deleteMeetingBtn.onclick = deleteMeeting;
  if (copyBtn) copyBtn.onclick = copyFinalDocument;
  if (printBtn) printBtn.onclick = printFinalDocument;
  if (exportTxtBtn) exportTxtBtn.onclick = exportFinalDocumentTxt;
  if (clearTranscriptBtn) clearTranscriptBtn.onclick = clearTranscript;

  if (improveBtn) improveBtn.onclick = () => aiEdit("improve");
  if (shortenBtn) shortenBtn.onclick = () => aiEdit("shorten");
  if (formalBtn) formalBtn.onclick = () => aiEdit("formal");
  if (bulletBtn) bulletBtn.onclick = () => aiEdit("bullet");
  if (grammarBtn) grammarBtn.onclick = () => aiEdit("grammar");
  if (applyAiInstructionBtn) {
    applyAiInstructionBtn.onclick = () => aiEdit("custom");
  }

  setRecordingUI(false);
  if (recordingTimerEl) recordingTimerEl.textContent = "00:00";
};
