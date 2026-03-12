const API_BASE = "https://childrens-homes-assistant-backend-new.onrender.com";

const modalOverlay = document.getElementById("aiMeetingModalOverlay");
const openModalBtn = document.getElementById("openAiMeetingModal");
const closeModalBtn = document.getElementById("closeAiMeetingModal");

const transcriptEl = document.getElementById("transcript");
const aiDraftEl = document.getElementById("aiDraft");
const finalNoteEl = document.getElementById("finalNote");

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
const transcribeBtn = document.getElementById("transcribeBtn");
const generateBtn = document.getElementById("generateBtn");
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

let mediaRecorder = null;
let recordingStream = null;
let recordedChunks = [];
let recordedBlob = null;
let timerInterval = null;
let recordingSeconds = 0;

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

function setRecordingUI(isRecording) {
  if (!recordingStatusEl || !micCircleEl || !startRecordingBtn || !stopRecordingBtn || !transcribeBtn) return;

  if (isRecording) {
    recordingStatusEl.textContent = "Recording live";
    recordingStatusEl.className = "status-pill recording";
    micCircleEl.classList.add("recording");
    startRecordingBtn.disabled = true;
    stopRecordingBtn.disabled = false;
    transcribeBtn.disabled = true;
  } else {
    recordingStatusEl.textContent = "Not recording";
    recordingStatusEl.className = "status-pill idle";
    micCircleEl.classList.remove("recording");
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
  }
}

function openModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
}

function resetMeetingState() {
  if (transcriptEl) transcriptEl.value = "";
  if (aiDraftEl) aiDraftEl.value = "";
  if (finalNoteEl) finalNoteEl.value = "";
  if (safeguardingBoxEl) safeguardingBoxEl.style.display = "none";
  if (safeguardingTextEl) safeguardingTextEl.textContent = "";
  if (audioPlaybackEl) {
    audioPlaybackEl.src = "";
    audioPlaybackEl.style.display = "none";
  }
  if (audioReadyTextEl) audioReadyTextEl.textContent = "No recording yet.";
  recordedBlob = null;
  recordedChunks = [];
  stopTimer();
  recordingSeconds = 0;
  if (recordingTimerEl) recordingTimerEl.textContent = "00:00";
  setRecordingUI(false);
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { detail: text || "Invalid server response" };
  }
}

async function startRecording() {
  try {
    recordedChunks = [];
    recordedBlob = null;

    if (audioPlaybackEl) {
      audioPlaybackEl.style.display = "none";
      audioPlaybackEl.src = "";
    }

    if (audioReadyTextEl) {
      audioReadyTextEl.textContent = "Recording in progress...";
    }

    if (transcribeBtn) {
      transcribeBtn.disabled = true;
    }

    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(recordingStream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });

      if (audioPlaybackEl) {
        const audioUrl = URL.createObjectURL(recordedBlob);
        audioPlaybackEl.src = audioUrl;
        audioPlaybackEl.style.display = "block";
      }

      if (audioReadyTextEl) {
        audioReadyTextEl.textContent = "Recording ready. You can now transcribe it.";
      }

      if (transcribeBtn) {
        transcribeBtn.disabled = false;
      }

      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
      }
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

async function transcribeAudio() {
  if (!recordedBlob) {
    alert("Please record a meeting first.");
    return;
  }

  const form = new FormData();
  form.append("file", recordedBlob, "meeting.webm");

  try {
    if (transcribeBtn) {
      transcribeBtn.disabled = true;
      transcribeBtn.textContent = "Transcribing...";
    }

    const response = await fetch(`${API_BASE}/ai-notes/transcribe`, {
      method: "POST",
      body: form,
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      alert(data.detail || "Transcription failed.");
      return;
    }

    if (transcriptEl) {
      transcriptEl.value = data.transcript || "";
    }

    showToast("Transcript created");
  } catch (error) {
    console.error("Transcription error:", error);
    alert("Could not connect to the meeting assistant service.");
  } finally {
    if (transcribeBtn) {
      transcribeBtn.disabled = false;
      transcribeBtn.textContent = "Transcribe";
    }
  }
}

async function generateTemplate() {
  const transcript = safeText(transcriptEl?.value);

  if (!transcript) {
    alert("Please record and transcribe a meeting first, or paste a transcript.");
    return;
  }

  const form = new FormData();
  form.append("transcript", transcript);

  try {
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
    }

    const response = await fetch(`${API_BASE}/ai-notes/generate`, {
      method: "POST",
      body: form,
      credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
      alert(data.detail || "Template generation failed.");
      return;
    }

    if (aiDraftEl) aiDraftEl.value = data.note || "";
    if (finalNoteEl) finalNoteEl.value = data.note || "";

    if (safeguardingBoxEl) safeguardingBoxEl.style.display = "block";
    if (safeguardingTextEl) {
      safeguardingTextEl.textContent =
        "AI-generated meeting template created. Please review, refine and approve before saving.";
    }

    showToast("Meeting template generated");
  } catch (error) {
    console.error("Generate error:", error);
    alert("Could not connect to the meeting assistant service.");
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate template";
    }
  }
}

async function aiEdit(mode) {
  const text = safeText(finalNoteEl?.value);

  if (!text) {
    alert("There is no final document to edit.");
    return;
  }

  const form = new FormData();
  form.append("text", text);
  form.append("mode", mode);

  try {
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
  }
}

async function saveMeetingNote() {
  const transcript = safeText(transcriptEl?.value);
  const aiDraft = safeText(aiDraftEl?.value);
  const finalNote = safeText(finalNoteEl?.value);

  if (!transcript || !aiDraft || !finalNote) {
    alert("Transcript, generated template and final document are all required before saving.");
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

    showToast("Meeting note saved");
  } catch (error) {
    console.error("Save error:", error);
    alert("Could not connect to the meeting assistant service.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save meeting note";
    }
  }
}

async function deleteMeeting() {
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

if (openModalBtn) openModalBtn.addEventListener("click", openModal);
if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

if (modalOverlay) {
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
}

if (startRecordingBtn) startRecordingBtn.addEventListener("click", startRecording);
if (stopRecordingBtn) stopRecordingBtn.addEventListener("click", stopRecording);
if (transcribeBtn) transcribeBtn.addEventListener("click", transcribeAudio);
if (generateBtn) generateBtn.addEventListener("click", generateTemplate);
if (saveBtn) saveBtn.addEventListener("click", saveMeetingNote);
if (deleteMeetingBtn) deleteMeetingBtn.addEventListener("click", deleteMeeting);
if (copyBtn) copyBtn.addEventListener("click", copyFinalDocument);
if (printBtn) printBtn.addEventListener("click", printFinalDocument);
if (exportTxtBtn) exportTxtBtn.addEventListener("click", exportFinalDocumentTxt);
if (clearTranscriptBtn) clearTranscriptBtn.addEventListener("click", clearTranscript);

if (improveBtn) improveBtn.addEventListener("click", () => aiEdit("improve"));
if (shortenBtn) shortenBtn.addEventListener("click", () => aiEdit("shorten"));
if (formalBtn) formalBtn.addEventListener("click", () => aiEdit("formal"));
if (bulletBtn) bulletBtn.addEventListener("click", () => aiEdit("bullet"));
if (grammarBtn) grammarBtn.addEventListener("click", () => aiEdit("grammar"));

setRecordingUI(false);
if (recordingTimerEl) recordingTimerEl.textContent = "00:00";
