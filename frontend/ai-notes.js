const API_BASE = "https://childrens-homes-assistant-backend-new.onrender.com";

/* -----------------------------
   Core fields
----------------------------- */
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

/* -----------------------------
   Main section buttons
----------------------------- */
const startRecordingBtn = document.getElementById("startRecordingBtn");
const stopRecordingBtn = document.getElementById("stopRecordingBtn");
const transcribeBtn = document.getElementById("transcribeBtn");
const generateBtn = document.getElementById("generateBtn");
const saveBtn = document.getElementById("saveBtn");

/* -----------------------------
   Toolbar buttons
----------------------------- */
const toolbarStartBtn = document.getElementById("toolbarStartBtn");
const toolbarStopBtn = document.getElementById("toolbarStopBtn");
const toolbarTranscribeBtn = document.getElementById("toolbarTranscribeBtn");
const toolbarGenerateBtn = document.getElementById("toolbarGenerateBtn");
const saveBtnTop = document.getElementById("saveBtnTop");

/* -----------------------------
   Utility buttons
----------------------------- */
const toggleTranscriptBtn = document.getElementById("toggleTranscriptBtn");
const transcriptContentEl = document.getElementById("transcriptContent");

const copyDraftToFinalBtn = document.getElementById("copyDraftToFinalBtn");
const copyDraftBtn = document.getElementById("copyDraftBtn");
const copyFinalBtn = document.getElementById("copyFinalBtn");
const printBtn = document.getElementById("printBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");

const applyAiEditBtn = document.getElementById("applyAiEditBtn");
const undoAiEditBtn = document.getElementById("undoAiEditBtn");
const aiInstructionEl = document.getElementById("aiInstruction");

/* -----------------------------
   Sections / progress
----------------------------- */
const progressSteps = document.querySelectorAll(".progress-step");
const sectionTargets = document.querySelectorAll("[data-scroll-target]");

/* -----------------------------
   State
----------------------------- */
let latestSafeguardingFlag = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordingStream = null;
let timerInterval = null;
let recordingSeconds = 0;
let transcriptVisible = true;
let previousAiDraft = "";

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

function formatTime(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
}

function safeSetText(el, text) {
    if (el) el.textContent = text;
}

function safeSetValue(el, value) {
    if (el) el.value = value;
}

function updateButtonState(button, disabled, text = null) {
    if (!button) return;
    button.disabled = disabled;
    if (text !== null) {
        button.textContent = text;
    }
}

function syncRecordingButtons(isRecording) {
    updateButtonState(startRecordingBtn, isRecording);
    updateButtonState(stopRecordingBtn, !isRecording);
    updateButtonState(toolbarStartBtn, isRecording);
    updateButtonState(toolbarStopBtn, !isRecording);
}

function syncTranscribeButtons(disabled, mainText = null, toolbarText = null) {
    updateButtonState(
        transcribeBtn,
        disabled,
        mainText ?? "Transcribe recording"
    );
    updateButtonState(
        toolbarTranscribeBtn,
        disabled,
        toolbarText ?? "Transcribe"
    );
}

function syncGenerateButtons(disabled, mainText = null, toolbarText = null) {
    updateButtonState(
        generateBtn,
        disabled,
        mainText ?? "Generate AI note"
    );
    updateButtonState(
        toolbarGenerateBtn,
        disabled,
        toolbarText ?? "Generate"
    );
}

function syncSaveButtons(disabled, mainText = null, toolbarText = null) {
    updateButtonState(
        saveBtn,
        disabled,
        mainText ?? "Save note"
    );
    updateButtonState(
        saveBtnTop,
        disabled,
        toolbarText ?? "Save"
    );
}

function setStatus(type, text) {
    if (!recordingStatusEl) return;
    recordingStatusEl.textContent = text;
    recordingStatusEl.className = `status-pill ${type}`;
}

function setRecordingUI(isRecording) {
    if (isRecording) {
        setStatus("recording", "Recording live");
        micCircleEl?.classList.add("recording");
        syncRecordingButtons(true);
        syncTranscribeButtons(true);
    } else {
        setStatus("idle", "Not recording");
        micCircleEl?.classList.remove("recording");
        syncRecordingButtons(false);
    }
}

function setProcessingUI(text = "Processing") {
    setStatus("processing", text);
    micCircleEl?.classList.remove("recording");
}

function setReadyUI(text = "Ready") {
    setStatus("success", text);
    micCircleEl?.classList.remove("recording");
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    recordingSeconds = 0;
    if (recordingTimerEl) {
        recordingTimerEl.textContent = "00:00";
    }
}

function startTimer() {
    resetTimer();
    timerInterval = setInterval(() => {
        recordingSeconds += 1;
        if (recordingTimerEl) {
            recordingTimerEl.textContent = formatTime(recordingSeconds);
        }
    }, 1000);
}

function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    target.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function safeJson(response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { detail: text || "Invalid server response" };
    }
}

function updateProgress(stepNumber) {
    progressSteps.forEach((step, index) => {
        if (index === stepNumber - 1) {
            step.classList.add("active");
        } else {
            step.classList.remove("active");
        }
    });
}

function copyText(text, successMessage) {
    if (!text.trim()) {
        alert("There is nothing to copy.");
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => showToast(successMessage))
        .catch(() => alert("Copy failed."));
}

function exportTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function printText(title, content) {
    if (!content.trim()) {
        alert("There is nothing to print.");
        return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Print window was blocked by the browser.");
        return;
    }

    const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 24px;
                        line-height: 1.5;
                        color: #111827;
                    }
                    h1 {
                        font-size: 22px;
                        margin-bottom: 18px;
                    }
                    pre {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <pre>${escaped}</pre>
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function clearAllFields() {
    const confirmed = window.confirm("Clear the transcript, AI draft and final note?");
    if (!confirmed) return;

    safeSetValue(transcriptEl, "");
    safeSetValue(aiDraftEl, "");
    safeSetValue(finalNoteEl, "");
    safeSetValue(aiInstructionEl, "");
    safeSetText(audioReadyTextEl, "No recording yet.");

    if (audioPlaybackEl) {
        audioPlaybackEl.src = "";
        audioPlaybackEl.style.display = "none";
    }

    if (safeguardingBoxEl) {
        safeguardingBoxEl.style.display = "none";
    }
    if (safeguardingTextEl) {
        safeguardingTextEl.textContent = "";
    }

    latestSafeguardingFlag = false;
    previousAiDraft = "";
    recordedBlob = null;
    recordedChunks = [];

    resetTimer();
    setRecordingUI(false);
    updateProgress(1);
    showToast("Cleared");
}

/* -----------------------------
   Recording
----------------------------- */
async function startRecording() {
    try {
        recordedChunks = [];
        recordedBlob = null;

        if (audioPlaybackEl) {
            audioPlaybackEl.style.display = "none";
            audioPlaybackEl.src = "";
        }

        safeSetText(audioReadyTextEl, "Recording in progress...");
        syncTranscribeButtons(true);

        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recordingStream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(recordedBlob);

            if (audioPlaybackEl) {
                audioPlaybackEl.src = audioUrl;
                audioPlaybackEl.style.display = "block";
            }

            safeSetText(audioReadyTextEl, "Recording ready for transcription.");
            syncTranscribeButtons(false);
            setReadyUI("Recording ready");

            if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
            }
        };

        mediaRecorder.start();
        setRecordingUI(true);
        updateProgress(1);
        startTimer();
        showToast("Recording started");
    } catch (error) {
        console.error("Microphone error:", error);
        alert("Unable to access microphone. Please allow microphone access in your browser.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    stopTimer();
    setProcessingUI("Finalising audio");
    syncRecordingButtons(false);
    showToast("Recording stopped");
}

/* -----------------------------
   Transcription
----------------------------- */
async function transcribeAudio() {
    if (!recordedBlob) {
        alert("Please record audio first.");
        return;
    }

    const form = new FormData();
    form.append("file", recordedBlob, "meeting.webm");

    try {
        setProcessingUI("Transcribing");
        syncTranscribeButtons(true, "Transcribing...", "Transcribing...");
        safeSetText(audioReadyTextEl, "Uploading and transcribing audio...");

        const response = await fetch(`${API_BASE}/ai-notes/transcribe`, {
            method: "POST",
            body: form,
            credentials: "include"
        });

        const data = await safeJson(response);

        if (!response.ok) {
            alert(data.detail || "Transcription failed.");
            setRecordingUI(false);
            return;
        }

        safeSetValue(transcriptEl, data.transcript || "");
        safeSetText(audioReadyTextEl, "Transcript ready.");
        updateProgress(2);
        setReadyUI("Transcript ready");
        showToast("Transcript created");
        scrollToSection("transcriptSection");
    } catch (error) {
        console.error("Transcribe error:", error);
        alert("Could not connect to the AI notes service.");
        setRecordingUI(false);
    } finally {
        syncTranscribeButtons(false, "Transcribe recording", "Transcribe");
    }
}

/* -----------------------------
   Note generation
----------------------------- */
async function generateNote() {
    const transcript = transcriptEl.value.trim();

    if (!transcript) {
        alert("Please record and transcribe audio first, or paste a transcript.");
        return;
    }

    const form = new FormData();
    form.append("transcript", transcript);

    try {
        setProcessingUI("Generating note");
        syncGenerateButtons(true, "Generating...", "Generating...");

        const response = await fetch(`${API_BASE}/ai-notes/generate`, {
            method: "POST",
            body: form,
            credentials: "include"
        });

        const data = await safeJson(response);

        if (!response.ok) {
            alert(data.detail || "Note generation failed.");
            setRecordingUI(false);
            return;
        }

        const note = data.note || "";
        safeSetValue(aiDraftEl, note);
        safeSetValue(finalNoteEl, note);

        previousAiDraft = note;
        latestSafeguardingFlag = !!data.safeguarding_flag;

        if (safeguardingBoxEl && safeguardingTextEl) {
            safeguardingBoxEl.style.display = "block";
            safeguardingTextEl.textContent = latestSafeguardingFlag
                ? `Possible safeguarding concern detected: ${data.safeguarding_reason || "Review required."}`
                : `No safeguarding concern detected: ${data.safeguarding_reason || "None identified."}`;
        }

        updateProgress(3);
        setReadyUI("Draft ready");
        showToast("AI draft generated");
        scrollToSection("draftSection");
    } catch (error) {
        console.error("Generate error:", error);
        alert("Could not connect to the AI notes service.");
        setRecordingUI(false);
    } finally {
        syncGenerateButtons(false, "Generate AI note", "Generate");
    }
}

/* -----------------------------
   AI edit
----------------------------- */
async function applyAiEdit() {
    const instruction = aiInstructionEl.value.trim();
    const currentDraft = aiDraftEl.value.trim();

    if (!currentDraft) {
        alert("Generate a draft first.");
        return;
    }

    previousAiDraft = aiDraftEl.value;

    const form = new FormData();
    form.append("text", currentDraft);
    form.append("mode", instruction ? "custom" : "improve");
    form.append("instruction", instruction);

    try {
        setProcessingUI("Applying AI edit");
        updateButtonState(applyAiEditBtn, true, "Applying...");

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

        aiDraftEl.value = data.text || "";
        showToast("AI edit applied");
    } catch (error) {
        console.error("AI edit error:", error);
        alert("Could not connect to the AI notes service.");
    } finally {
        updateButtonState(applyAiEditBtn, false, "Apply AI edit");
        setReadyUI("Draft ready");
    }
}

function undoAiEdit() {
    if (!previousAiDraft) {
        alert("There is no previous draft to restore.");
        return;
    }

    aiDraftEl.value = previousAiDraft;
    showToast("Last AI edit undone");
}

/* -----------------------------
   Save
----------------------------- */
async function saveNote() {
    const transcript = transcriptEl.value.trim();
    const aiDraft = aiDraftEl.value.trim();
    const finalNote = finalNoteEl.value.trim();

    if (!transcript || !aiDraft || !finalNote) {
        alert("Transcript, AI draft and final note are required.");
        return;
    }

    const form = new FormData();
    form.append("transcript", transcript);
    form.append("ai_draft", aiDraft);
    form.append("final_note", finalNote);
    form.append("safeguarding_flag", String(latestSafeguardingFlag));

    try {
        setProcessingUI("Saving");
        syncSaveButtons(true, "Saving...", "Saving...");

        const response = await fetch(`${API_BASE}/ai-notes/save`, {
            method: "POST",
            body: form,
            credentials: "include"
        });

        const data = await safeJson(response);

        if (!response.ok) {
            alert(data.detail || "Save failed.");
            setRecordingUI(false);
            return;
        }

        updateProgress(5);
        setReadyUI("Saved");
        showToast("AI note saved successfully");
        scrollToSection("finalSection");
    } catch (error) {
        console.error("Save error:", error);
        alert("Could not connect to the AI notes service.");
        setRecordingUI(false);
    } finally {
        syncSaveButtons(false, "Save note", "Save");
    }
}

/* -----------------------------
   Draft / final note helpers
----------------------------- */
function copyDraftToFinal() {
    const draft = aiDraftEl.value.trim();

    if (!draft) {
        alert("There is no AI draft to copy.");
        return;
    }

    finalNoteEl.value = aiDraftEl.value;
    updateProgress(4);
    showToast("Draft copied to final note");
    scrollToSection("finalSection");
}

function toggleTranscript() {
    transcriptVisible = !transcriptVisible;

    if (transcriptVisible) {
        transcriptContentEl?.classList.remove("hidden");
        toggleTranscriptBtn.textContent = "Show / hide";
    } else {
        transcriptContentEl?.classList.add("hidden");
        toggleTranscriptBtn.textContent = "Show / hide";
    }
}

/* -----------------------------
   Navigation
----------------------------- */
function bindScrollButtons() {
    sectionTargets.forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-scroll-target");
            if (targetId) {
                scrollToSection(targetId);
            }
        });
    });
}

/* -----------------------------
   Utility button actions
----------------------------- */
function bindUtilityButtons() {
    copyDraftToFinalBtn?.addEventListener("click", copyDraftToFinal);
    copyDraftBtn?.addEventListener("click", copyDraftToFinal);

    toggleTranscriptBtn?.addEventListener("click", toggleTranscript);

    copyFinalBtn?.addEventListener("click", () => {
        copyText(finalNoteEl.value, "Final note copied");
    });

    printBtn?.addEventListener("click", () => {
        printText("AI Note", finalNoteEl.value);
    });

    exportBtn?.addEventListener("click", () => {
        const content = finalNoteEl.value.trim();

        if (!content) {
            alert("There is nothing to export.");
            return;
        }

        exportTextFile("ai-note.txt", content);
        showToast("Export started");
    });

    clearBtn?.addEventListener("click", clearAllFields);

    applyAiEditBtn?.addEventListener("click", applyAiEdit);
    undoAiEditBtn?.addEventListener("click", undoAiEdit);
}

/* -----------------------------
   Main button bindings
----------------------------- */
function bindMainButtons() {
    startRecordingBtn?.addEventListener("click", startRecording);
    stopRecordingBtn?.addEventListener("click", stopRecording);
    transcribeBtn?.addEventListener("click", transcribeAudio);
    generateBtn?.addEventListener("click", generateNote);
    saveBtn?.addEventListener("click", saveNote);

    toolbarStartBtn?.addEventListener("click", startRecording);
    toolbarStopBtn?.addEventListener("click", stopRecording);
    toolbarTranscribeBtn?.addEventListener("click", transcribeAudio);
    toolbarGenerateBtn?.addEventListener("click", generateNote);
    saveBtnTop?.addEventListener("click", saveNote);
}

/* -----------------------------
   Init
----------------------------- */
function init() {
    bindMainButtons();
    bindUtilityButtons();
    bindScrollButtons();

    resetTimer();
    setRecordingUI(false);
    updateProgress(1);

    syncGenerateButtons(false, "Generate AI note", "Generate");
    syncSaveButtons(false, "Save note", "Save");
    syncTranscribeButtons(true, "Transcribe recording", "Transcribe");

    if (safeguardingBoxEl) {
        safeguardingBoxEl.style.display = "none";
    }
}

init();
