document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";

    const els = {
        startRecordingBtn: document.getElementById("startRecordingBtn"),
        transcribeBtn: document.getElementById("transcribeBtn"),
        improveBtn: document.getElementById("improveBtn"),
        saveBtn: document.getElementById("saveBtn"),
        exportPdfBtn: document.getElementById("exportPdfBtn"),
        exportDocxBtn: document.getElementById("exportDocxBtn"),
        printBtn: document.getElementById("printBtn"),
        clearBtn: document.getElementById("clearBtn"),
        refreshSavedBtn: document.getElementById("refreshSavedBtn"),

        noteTitleEl: document.getElementById("noteTitle"),
        aiInstructionEl: document.getElementById("aiInstruction"),
        transcriptEl: document.getElementById("transcript"),
        finalNoteEl: document.getElementById("finalNote"),

        savedNotesBody: document.getElementById("savedNotesBody"),
        savedEmptyState: document.getElementById("savedEmptyState"),

        recordingStatusEl: document.getElementById("recordingStatus"),

        recordingModalEl: document.getElementById("recordingModal"),
        recordingMicEl: document.getElementById("recordingMic"),
        recordingTimerEl: document.getElementById("recordingTimer"),
        recordingModalStatusEl: document.getElementById("recordingModalStatus"),
        pauseRecordingBtn: document.getElementById("pauseRecordingBtn"),
        resumeRecordingBtn: document.getElementById("resumeRecordingBtn"),
        stopRecordingBtn: document.getElementById("stopRecordingBtn"),

        toastEl: document.getElementById("toast"),
        audioPlaybackEl: document.getElementById("audioPlayback")
    };

    const state = {
        mediaRecorder: null,
        recordingStream: null,
        recordedChunks: [],
        recordedBlob: null,
        recordingMimeType: "",
        recordingExtension: "webm",
        currentTimerInterval: null,
        recordingStartTime: null,
        pausedAt: null,
        totalPausedMs: 0,
        currentNoteId: null,
        savedNotes: []
    };

    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAccessToken();
        return token ? { ...extraHeaders, Authorization: `Bearer ${token}` } : { ...extraHeaders };
    }

    function redirectToLogin() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.location.href = "/login";
    }

    async function safeJson(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { detail: text || "Invalid server response" };
        }
    }

    function handleUnauthorized(response, data = null) {
        if (response.status === 401) {
            alert((data && data.detail) || "Your session has expired. Please log in again.");
            redirectToLogin();
            return true;
        }
        return false;
    }

    function showToast(message) {
        if (!els.toastEl) return;
        els.toastEl.textContent = message;
        els.toastEl.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            els.toastEl.classList.remove("show");
        }, 2200);
    }

    function setStatus(mode, label) {
        if (!els.recordingStatusEl) return;
        els.recordingStatusEl.className = `status-pill ${mode}`;
        els.recordingStatusEl.textContent = label;
    }

    function formatTime(totalSeconds) {
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function getElapsedRecordingSeconds() {
        if (!state.recordingStartTime) return 0;
        const now = state.pausedAt || Date.now();
        return Math.max(0, Math.floor((now - state.recordingStartTime - state.totalPausedMs) / 1000));
    }

    function startRecordingTimer() {
        stopRecordingTimer();
        state.recordingStartTime = Date.now();
        state.totalPausedMs = 0;
        state.pausedAt = null;

        state.currentTimerInterval = setInterval(() => {
            const formatted = formatTime(getElapsedRecordingSeconds());
            if (els.recordingTimerEl) els.recordingTimerEl.textContent = formatted;
        }, 250);
    }

    function stopRecordingTimer() {
        if (state.currentTimerInterval) {
            clearInterval(state.currentTimerInterval);
            state.currentTimerInterval = null;
        }
    }

    function openRecordingModal() {
        els.recordingModalEl?.classList.remove("hidden");
        els.recordingMicEl?.classList.add("recording");
        els.recordingMicEl?.classList.remove("paused");
        if (els.recordingModalStatusEl) els.recordingModalStatusEl.textContent = "Recording live";
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = false;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
        if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = false;
    }

    function closeRecordingModal() {
        els.recordingModalEl?.classList.add("hidden");
        els.recordingMicEl?.classList.remove("recording", "paused");
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = true;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
        if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = true;
    }

    function getSupportedRecordingOptions() {
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
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "")
            .split("\n")
            .map(line => line.trim())
            .find(Boolean);
        return firstLine ? firstLine.replace(/[:#*-]/g, "").slice(0, 120) : "Meeting note";
    }

    async function verifyAuth() {
        const token = getAccessToken();
        if (!token) {
            redirectToLogin();
            return false;
        }

        const response = await fetch("/auth/me", {
            headers: getAuthHeaders()
        });

        const data = await safeJson(response);

        if (!response.ok) {
            if (handleUnauthorized(response, data)) return false;
            if (response.status === 403) {
                alert(data.detail || "Subscription required");
                return false;
            }
            alert(data.detail || "Could not load your account.");
            return false;
        }

        return true;
    }

    async function startRecording() {
        try {
            state.recordedChunks = [];
            state.recordedBlob = null;

            if (els.audioPlaybackEl) {
                els.audioPlaybackEl.src = "";
                els.audioPlaybackEl.style.display = "none";
            }

            const option = getSupportedRecordingOptions();
            state.recordingMimeType = option.mimeType;
            state.recordingExtension = option.extension;

            state.recordingStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            state.mediaRecorder = state.recordingMimeType
                ? new MediaRecorder(state.recordingStream, { mimeType: state.recordingMimeType })
                : new MediaRecorder(state.recordingStream);

            state.mediaRecorder.ondataavailable = event => {
                if (event.data && event.data.size > 0) {
                    state.recordedChunks.push(event.data);
                }
            };

            state.mediaRecorder.onstop = async () => {
                if (!state.recordedChunks.length) {
                    alert("No recording captured.");
                    return;
                }

                state.recordedBlob = new Blob(state.recordedChunks, {
                    type: state.recordingMimeType || "audio/webm"
                });

                if (els.audioPlaybackEl) {
                    els.audioPlaybackEl.src = URL.createObjectURL(state.recordedBlob);
                    els.audioPlaybackEl.style.display = "block";
                }

                if (state.recordingStream) {
                    state.recordingStream.getTracks().forEach(track => track.stop());
                }

                closeRecordingModal();
                setStatus("processing", "Transcribing...");
                els.transcribeBtn.disabled = false;

                await transcribeAudio(true);
            };

            state.mediaRecorder.start(1000);

            setStatus("recording", "Recording");
            startRecordingTimer();
            openRecordingModal();
            if (els.startRecordingBtn) els.startRecordingBtn.disabled = true;
        } catch (error) {
            console.error(error);
            alert("Unable to access microphone.");
        }
    }

    function pauseRecording() {
        if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
        state.mediaRecorder.pause();
        state.pausedAt = Date.now();

        els.recordingMicEl?.classList.remove("recording");
        els.recordingMicEl?.classList.add("paused");
        if (els.recordingModalStatusEl) els.recordingModalStatusEl.textContent = "Paused";
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = true;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = false;
    }

    function resumeRecording() {
        if (!state.mediaRecorder || state.mediaRecorder.state !== "paused") return;
        state.mediaRecorder.resume();

        if (state.pausedAt) {
            state.totalPausedMs += Date.now() - state.pausedAt;
            state.pausedAt = null;
        }

        els.recordingMicEl?.classList.remove("paused");
        els.recordingMicEl?.classList.add("recording");
        if (els.recordingModalStatusEl) els.recordingModalStatusEl.textContent = "Recording live";
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = false;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
    }

    function stopRecording() {
        if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
            if (state.pausedAt) {
                state.totalPausedMs += Date.now() - state.pausedAt;
                state.pausedAt = null;
            }
            state.mediaRecorder.stop();
            stopRecordingTimer();
            if (els.startRecordingBtn) els.startRecordingBtn.disabled = false;
        }
    }

    async function transcribeAudio(autoGenerate = false) {
        if (!state.recordedBlob) {
            alert("Please record audio first.");
            return;
        }

        const filename = `meeting-note.${state.recordingExtension || "webm"}`;
        const form = new FormData();
        form.append("file", state.recordedBlob, filename);

        try {
            setStatus("processing", "Transcribing...");

            const response = await fetch("/ai-notes/transcribe", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Transcription failed.");
                setStatus("idle", "Ready");
                return;
            }

            const transcript = (data.transcript || "").trim();
            if (els.transcriptEl) els.transcriptEl.value = transcript;
            if (els.finalNoteEl && !els.finalNoteEl.value.trim()) {
                els.finalNoteEl.value = transcript;
            }
            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = deriveTitleFromText(transcript);
            }

            setStatus("success", "Transcript ready");
            showToast("Transcription complete.");

            if (autoGenerate && transcript) {
                await improveWithAI(true);
            }
        } catch (error) {
            console.error(error);
            alert("Could not connect to transcription service.");
            setStatus("idle", "Ready");
        }
    }

    async function improveWithAI(silent = false) {
        const sourceText = (els.finalNoteEl?.value || els.transcriptEl?.value || "").trim();
        const instruction = (els.aiInstructionEl?.value || "").trim() || "Turn this into a professional meeting note using clear, factual language.";

        if (!sourceText) {
            alert("There is no text to improve.");
            return;
        }

        const form = new FormData();
        form.append("text", sourceText);
        form.append("mode", "custom");
        form.append("instruction", instruction);

        try {
            setStatus("processing", "Improving note...");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "AI edit failed.");
                setStatus("idle", "Ready");
                return;
            }

            if (els.finalNoteEl) {
                els.finalNoteEl.value = data.text || sourceText;
            }

            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = deriveTitleFromText(els.finalNoteEl.value);
            }

            setStatus("success", "Note ready");
            if (!silent) showToast("Note improved with AI.");
        } catch (error) {
            console.error(error);
            alert("Could not connect to AI service.");
            setStatus("idle", "Ready");
        }
    }

    async function saveNote() {
        const transcript = (els.transcriptEl?.value || "").trim();
        const finalNote = (els.finalNoteEl?.value || "").trim();
        const title = (els.noteTitleEl?.value || "").trim() || deriveTitleFromText(finalNote);

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

        if (state.currentNoteId) {
            form.append("note_id", String(state.currentNoteId));
        }

        try {
            setStatus("processing", "Saving...");

            const response = await fetch("/ai-notes/save", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Save failed.");
                setStatus("idle", "Ready");
                return;
            }

            state.currentNoteId = data.record?.id || data.id || state.currentNoteId;
            setStatus("success", "Saved");
            showToast("Note saved.");
            await loadSavedNotes();
        } catch (error) {
            console.error(error);
            alert("Could not connect to save service.");
            setStatus("idle", "Ready");
        }
    }

    async function loadSavedNotes() {
        try {
            const response = await fetch("/ai-notes/history", {
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Could not load saved notes.");
                return;
            }

            state.savedNotes = Array.isArray(data.notes) ? data.notes : [];
            renderSavedNotes();
        } catch (error) {
            console.error(error);
            alert("Could not load saved notes.");
        }
    }

    function renderSavedNotes() {
        if (!els.savedNotesBody || !els.savedEmptyState) return;

        els.savedNotesBody.innerHTML = "";

        if (!state.savedNotes.length) {
            els.savedEmptyState.style.display = "block";
            return;
        }

        els.savedEmptyState.style.display = "none";

        state.savedNotes.forEach(note => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(note.title || "Untitled note")}</td>
                <td>${note.updated_at ? new Date(note.updated_at).toLocaleString("en-GB") : "—"}</td>
                <td>
                    <div class="saved-actions">
                        <button class="btn btn-light" type="button" data-edit-id="${note.id}">Edit</button>
                        <button class="btn btn-danger" type="button" data-delete-id="${note.id}">Delete</button>
                    </div>
                </td>
            `;
            els.savedNotesBody.appendChild(tr);
        });
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function loadNoteIntoEditor(noteId) {
        const note = state.savedNotes.find(item => String(item.id) === String(noteId));
        if (!note) return;

        state.currentNoteId = note.id;
        if (els.noteTitleEl) els.noteTitleEl.value = note.title || "";
        if (els.transcriptEl) els.transcriptEl.value = note.transcript || "";
        if (els.finalNoteEl) els.finalNoteEl.value = note.final_note || "";
        setStatus("success", "Editing saved note");
        showToast("Saved note loaded.");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function deleteNote(noteId) {
        const confirmed = window.confirm("Delete this saved note?");
        if (!confirmed) return;

        try {
            const response = await fetch(`/ai-notes/${encodeURIComponent(noteId)}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Delete failed.");
                return;
            }

            if (String(state.currentNoteId) === String(noteId)) {
                state.currentNoteId = null;
            }

            showToast("Note deleted.");
            await loadSavedNotes();
        } catch (error) {
            console.error(error);
            alert("Could not delete note.");
        }
    }

    async function exportNote(format) {
        const finalNote = (els.finalNoteEl?.value || "").trim();
        const title = (els.noteTitleEl?.value || "").trim() || "Meeting Note";

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
                headers: getAuthHeaders(),
                body: form
            });

            if (!response.ok) {
                const data = await safeJson(response);
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Export failed.");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${title}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast(`Exported as ${format.toUpperCase()}.`);
        } catch (error) {
            console.error(error);
            alert("Could not export note.");
        }
    }

    function printNote() {
        const title = (els.noteTitleEl?.value || "").trim() || "Meeting Note";
        const content = (els.finalNoteEl?.value || "").trim();

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

    function clearEditor() {
        const confirmed = window.confirm("Clear the current note?");
        if (!confirmed) return;

        state.currentNoteId = null;
        if (els.noteTitleEl) els.noteTitleEl.value = "";
        if (els.aiInstructionEl) els.aiInstructionEl.value = "";
        if (els.transcriptEl) els.transcriptEl.value = "";
        if (els.finalNoteEl) els.finalNoteEl.value = "";
        state.recordedBlob = null;
        setStatus("idle", "Ready");
        showToast("Editor cleared.");
    }

    function bindEvents() {
        els.startRecordingBtn?.addEventListener("click", startRecording);
        els.pauseRecordingBtn?.addEventListener("click", pauseRecording);
        els.resumeRecordingBtn?.addEventListener("click", resumeRecording);
        els.stopRecordingBtn?.addEventListener("click", stopRecording);

        els.transcribeBtn?.addEventListener("click", () => transcribeAudio(false));
        els.improveBtn?.addEventListener("click", () => improveWithAI(false));
        els.saveBtn?.addEventListener("click", saveNote);
        els.exportPdfBtn?.addEventListener("click", () => exportNote("pdf"));
        els.exportDocxBtn?.addEventListener("click", () => exportNote("docx"));
        els.printBtn?.addEventListener("click", printNote);
        els.clearBtn?.addEventListener("click", clearEditor);
        els.refreshSavedBtn?.addEventListener("click", loadSavedNotes);

        els.savedNotesBody?.addEventListener("click", event => {
            const editId = event.target.getAttribute("data-edit-id");
            const deleteId = event.target.getAttribute("data-delete-id");

            if (editId) {
                loadNoteIntoEditor(editId);
            }

            if (deleteId) {
                deleteNote(deleteId);
            }
        });
    }

    async function init() {
        const ok = await verifyAuth();
        if (!ok) return;

        bindEvents();
        setStatus("idle", "Ready");
        await loadSavedNotes();
    }

    init();
});
