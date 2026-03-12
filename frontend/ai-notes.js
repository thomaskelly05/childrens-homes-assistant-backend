const API_BASE = "https://childrens-homes-assistant-backend-new.onrender.com";

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

let latestSafeguardingFlag = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordingStream = null;
let timerInterval = null;
let recordingSeconds = 0;

function showToast(message) {
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

function setRecordingUI(isRecording) {
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

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    recordingSeconds = 0;
    recordingTimerEl.textContent = "00:00";
}

function startTimer() {
    resetTimer();
    timerInterval = setInterval(() => {
        recordingSeconds += 1;
        recordingTimerEl.textContent = formatTime(recordingSeconds);
    }, 1000);
}

async function startRecording() {
    try {
        recordedChunks = [];
        recordedBlob = null;
        audioPlaybackEl.style.display = "none";
        audioPlaybackEl.src = "";
        audioReadyTextEl.textContent = "Recording in progress...";
        transcribeBtn.disabled = true;

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

            audioPlaybackEl.src = audioUrl;
            audioPlaybackEl.style.display = "block";
            audioReadyTextEl.textContent = "Recording ready for transcription.";
            transcribeBtn.disabled = false;

            if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
            }
        };

        mediaRecorder.start();
        setRecordingUI(true);
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
    setRecordingUI(false);
    showToast("Recording stopped");
}

async function safeJson(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { detail: text || "Invalid server response" };
    }
}

async function transcribeAudio() {
    if (!recordedBlob) {
        alert("Please record audio first.");
        return;
    }

    const form = new FormData();
    form.append("file", recordedBlob, "meeting.webm");

    try {
        transcribeBtn.disabled = true;
        transcribeBtn.textContent = "Transcribing...";

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

        transcriptEl.value = data.transcript || "";
        showToast("Transcript created");
    } catch (error) {
        console.error("Transcribe error:", error);
        alert("Could not connect to the AI notes service.");
    } finally {
        transcribeBtn.disabled = false;
        transcribeBtn.textContent = "Transcribe recording";
    }
}

async function generateNote() {
    const transcript = transcriptEl.value.trim();

    if (!transcript) {
        alert("Please record and transcribe audio first, or paste a transcript.");
        return;
    }

    const form = new FormData();
    form.append("transcript", transcript);

    try {
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        const response = await fetch(`${API_BASE}/ai-notes/generate`, {
            method: "POST",
            body: form,
            credentials: "include"
        });

        const data = await safeJson(response);

        if (!response.ok) {
            alert(data.detail || "Note generation failed.");
            return;
        }

        aiDraftEl.value = data.note || "";
        finalNoteEl.value = data.note || "";

        latestSafeguardingFlag = !!data.safeguarding_flag;

        safeguardingBoxEl.style.display = "block";
        safeguardingTextEl.textContent = latestSafeguardingFlag
            ? `Possible safeguarding concern detected: ${data.safeguarding_reason || "Review required."}`
            : `No safeguarding concern detected: ${data.safeguarding_reason || "None identified."}`;

        showToast("AI draft generated");
    } catch (error) {
        console.error("Generate error:", error);
        alert("Could not connect to the AI notes service.");
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate AI note";
    }
}

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
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

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

        showToast("AI note saved successfully");
    } catch (error) {
        console.error("Save error:", error);
        alert("Could not connect to the AI notes service.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save note";
    }
}

startRecordingBtn.addEventListener("click", startRecording);
stopRecordingBtn.addEventListener("click", stopRecording);
transcribeBtn.addEventListener("click", transcribeAudio);
generateBtn.addEventListener("click", generateNote);
saveBtn.addEventListener("click", saveNote);

resetTimer();
setRecordingUI(false);
