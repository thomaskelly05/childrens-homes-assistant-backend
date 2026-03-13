const API_BASE = "https://childrens-homes-assistant-backend-new.onrender.com";
const TEMPLATE_STORAGE_KEY = "indicare_custom_note_templates";

/* -----------------------------
   Elements
----------------------------- */

const transcriptEl = document.getElementById("transcript");
const transcriptMirrorEl = document.getElementById("transcriptMirror");
const aiDraftEl = document.getElementById("aiDraft");
const finalNoteEl = document.getElementById("finalNote");

const noteModeBadgeEl = document.getElementById("noteModeBadge");

const safeguardingBoxEl = document.getElementById("safeguardingBox");
const safeguardingTextEl = document.getElementById("safeguardingText");

const recordingStatusEl = document.getElementById("recordingStatus");
const recordingTimerEl = document.getElementById("recordingTimer");
const recordingTimerMirrorEl = document.getElementById("recordingTimerMirror");
const micCircleEl = document.getElementById("micCircle");

const historyListEl = document.getElementById("historyList");
const historyEmptyStateEl = document.getElementById("historyEmptyState");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

const startRecordingBtn = document.getElementById("startRecordingBtn");
const stopRecordingBtn = document.getElementById("stopRecordingBtn");
const transcribeBtn = document.getElementById("transcribeBtn");
const generateBtn = document.getElementById("generateBtn");

const saveBtn = document.getElementById("saveBtn");
const saveBtnTop = document.getElementById("saveBtnTop");

const exportBtnTop = document.getElementById("exportBtnTop");
const printBtnTop = document.getElementById("printBtnTop");

const exportBtn = document.getElementById("exportBtn");
const printBtn = document.getElementById("printBtn");

const clearBtn = document.getElementById("clearBtn");

const applyAiEditBtn = document.getElementById("applyAiEditBtn");
const undoAiEditBtn = document.getElementById("undoAiEditBtn");

const aiInstructionEl = document.getElementById("aiInstruction");

const templateSelectEl = document.getElementById("templateSelect");

const toastEl = document.getElementById("toast");

/* -----------------------------
   State
----------------------------- */

let openedNoteId = null;

let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;

let timerInterval = null;
let recordingSeconds = 0;

let latestSafeguardingFlag = false;
let latestSafeguardingReason = "";

let previousFinalNote = "";

/* -----------------------------
   Helpers
----------------------------- */

function showToast(message) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.add("show");

    setTimeout(() => {
        toastEl.classList.remove("show");
    }, 2600);
}

function updateNoteModeBadge() {

    if (!noteModeBadgeEl) return;

    if (openedNoteId) {
        noteModeBadgeEl.textContent = "Editing saved note";
        noteModeBadgeEl.className = "note-mode-badge is-editing";
    } else {
        noteModeBadgeEl.textContent = "New unsaved note";
        noteModeBadgeEl.className = "note-mode-badge is-new";
    }
}

function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
}

function updateTimerDisplays(value) {

    if (recordingTimerEl) recordingTimerEl.textContent = value;
    if (recordingTimerMirrorEl) recordingTimerMirrorEl.textContent = value;
}

function resetTimer() {

    recordingSeconds = 0;
    updateTimerDisplays("00:00");
}

function startTimer() {

    resetTimer();

    timerInterval = setInterval(() => {

        recordingSeconds += 1;
        updateTimerDisplays(formatTime(recordingSeconds));

    }, 1000);
}

function stopTimer() {

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
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

/* -----------------------------
   History
----------------------------- */

function renderHistory(notes) {

    if (!historyListEl) return;

    historyListEl.innerHTML = "";

    if (!notes.length) {
        historyEmptyStateEl.style.display = "block";
        return;
    }

    historyEmptyStateEl.style.display = "none";

    notes.forEach(note => {

        const item = document.createElement("div");
        item.className = "history-item";

        item.innerHTML = `
            <div class="history-title">${note.title || "Untitled note"}</div>
            <div class="history-meta">${new Date(note.created_at).toLocaleString()}</div>
            <div class="history-actions">
                <button class="btn btn-light btn-tiny" data-open="${note.id}">Open</button>
                <button class="btn btn-danger btn-tiny" data-delete="${note.id}">Delete</button>
            </div>
        `;

        historyListEl.appendChild(item);
    });

    historyListEl.querySelectorAll("[data-open]").forEach(btn => {
        btn.addEventListener("click", () => openHistoryNote(btn.dataset.open));
    });

    historyListEl.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", () => deleteHistoryNote(btn.dataset.delete));
    });
}

async function loadHistory() {

    try {

        const response = await fetch(`${API_BASE}/ai-notes/history?limit=10`, {
            credentials: "include"
        });

        const data = await safeJson(response);

        if (!response.ok) throw new Error(data.detail);

        renderHistory(data.notes || []);

    } catch (error) {

        console.error(error);
        historyEmptyStateEl.textContent = "Could not load notes.";
        historyEmptyStateEl.style.display = "block";
    }
}

async function openHistoryNote(noteId) {

    const response = await fetch(`${API_BASE}/ai-notes/history/${noteId}`, {
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail || "Could not load note");
        return;
    }

    const note = data.note;

    openedNoteId = note.id;

    transcriptEl.value = note.transcript;
    transcriptMirrorEl.value = note.transcript;
    aiDraftEl.value = note.ai_draft;
    finalNoteEl.value = note.final_note;

    latestSafeguardingFlag = note.safeguarding_flag;
    latestSafeguardingReason = note.safeguarding_reason;

    updateNoteModeBadge();
}

async function deleteHistoryNote(noteId) {

    if (!confirm("Delete this saved note?")) return;

    const form = new FormData();
    form.append("note_id", noteId);

    const response = await fetch(`${API_BASE}/ai-notes/delete`, {
        method: "POST",
        body: form,
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    showToast("Note deleted");
    loadHistory();
}

/* -----------------------------
   Recording
----------------------------- */

async function startRecording() {

    openedNoteId = null;
    updateNoteModeBadge();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);

    recordedChunks = [];

    mediaRecorder.ondataavailable = e => {

        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {

        recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
    };

    mediaRecorder.start();

    startTimer();
}

function stopRecording() {

    if (mediaRecorder) mediaRecorder.stop();

    stopTimer();
}

/* -----------------------------
   Transcription
----------------------------- */

async function transcribeAudio() {

    if (!recordedBlob) {
        alert("Record audio first");
        return;
    }

    const form = new FormData();
    form.append("file", recordedBlob, "meeting.webm");

    const response = await fetch(`${API_BASE}/ai-notes/transcribe`, {
        method: "POST",
        body: form,
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    transcriptEl.value = data.transcript;
    transcriptMirrorEl.value = data.transcript;
}

/* -----------------------------
   Generate AI note
----------------------------- */

async function generateNote() {

    const transcript = transcriptEl.value.trim();

    if (!transcript) {
        alert("Transcript required");
        return;
    }

    openedNoteId = null;
    updateNoteModeBadge();

    const form = new FormData();
    form.append("transcript", transcript);

    const response = await fetch(`${API_BASE}/ai-notes/generate`, {
        method: "POST",
        body: form,
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    aiDraftEl.value = data.note;
    finalNoteEl.value = data.note;

    latestSafeguardingFlag = data.safeguarding_flag;
    latestSafeguardingReason = data.safeguarding_reason;

    previousFinalNote = data.note;
}

/* -----------------------------
   AI edit
----------------------------- */

async function applyAiEdit() {

    const instruction = aiInstructionEl.value.trim();
    const text = finalNoteEl.value.trim();

    if (!instruction || !text) {
        alert("Instruction and text required");
        return;
    }

    previousFinalNote = finalNoteEl.value;

    const form = new FormData();

    form.append("text", text);
    form.append("mode", "custom");
    form.append("instruction", instruction);

    const response = await fetch(`${API_BASE}/ai-notes/edit`, {
        method: "POST",
        body: form,
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    finalNoteEl.value = data.text;
}

function undoAiEdit() {

    if (!previousFinalNote) return;

    finalNoteEl.value = previousFinalNote;
}

/* -----------------------------
   Save
----------------------------- */

async function saveNote() {

    const transcript = transcriptEl.value.trim();
    const aiDraft = aiDraftEl.value.trim();
    const finalNote = finalNoteEl.value.trim();

    if (!transcript || !aiDraft || !finalNote) {
        alert("Transcript, draft and final note required");
        return;
    }

    const form = new FormData();

    form.append("transcript", transcript);
    form.append("ai_draft", aiDraft);
    form.append("final_note", finalNote);
    form.append("safeguarding_flag", String(latestSafeguardingFlag));
    form.append("safeguarding_reason", latestSafeguardingReason);

    if (openedNoteId) {
        form.append("note_id", openedNoteId);
    }

    const response = await fetch(`${API_BASE}/ai-notes/save`, {
        method: "POST",
        body: form,
        credentials: "include"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    if (data.record?.id) {
        openedNoteId = data.record.id;
    }

    updateNoteModeBadge();

    showToast(data.updated ? "Note updated" : "Note saved");

    loadHistory();
}

/* -----------------------------
   Export
----------------------------- */

function exportTextFile(filename, content) {

    const blob = new Blob([content], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    link.click();
}

/* -----------------------------
   Print
----------------------------- */

function printText(title, content) {

    const win = window.open("", "_blank");

    win.document.write(`<pre>${content}</pre>`);

    win.print();
}

/* -----------------------------
   Clear
----------------------------- */

function clearAllFields() {

    if (!confirm("Clear the note?")) return;

    transcriptEl.value = "";
    transcriptMirrorEl.value = "";
    aiDraftEl.value = "";
    finalNoteEl.value = "";

    openedNoteId = null;

    updateNoteModeBadge();
}

/* -----------------------------
   Event bindings
----------------------------- */

function bindButtons() {

    startRecordingBtn?.addEventListener("click", startRecording);
    stopRecordingBtn?.addEventListener("click", stopRecording);

    transcribeBtn?.addEventListener("click", transcribeAudio);

    generateBtn?.addEventListener("click", generateNote);

    applyAiEditBtn?.addEventListener("click", applyAiEdit);
    undoAiEditBtn?.addEventListener("click", undoAiEdit);

    saveBtn?.addEventListener("click", saveNote);
    saveBtnTop?.addEventListener("click", saveNote);

    exportBtn?.addEventListener("click", () =>
        exportTextFile("note.txt", finalNoteEl.value)
    );

    exportBtnTop?.addEventListener("click", () =>
        exportTextFile("note.txt", finalNoteEl.value)
    );

    printBtn?.addEventListener("click", () =>
        printText("AI Note", finalNoteEl.value)
    );

    printBtnTop?.addEventListener("click", () =>
        printText("AI Note", finalNoteEl.value)
    );

    clearBtn?.addEventListener("click", clearAllFields);

    refreshHistoryBtn?.addEventListener("click", loadHistory);
}

/* -----------------------------
   Init
----------------------------- */

function init() {

    bindButtons();

    updateNoteModeBadge();

    resetTimer();

    loadHistory();
}

init();
