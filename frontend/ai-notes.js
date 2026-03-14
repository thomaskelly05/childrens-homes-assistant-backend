document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.location.origin;
    const ACCESS_TOKEN_KEY = "access_token";

    /* -----------------------------
       Auth helpers
    ----------------------------- */
    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAccessToken();

        if (!token) {
            return { ...extraHeaders };
        }

        return {
            ...extraHeaders,
            Authorization: `Bearer ${token}`
        };
    }

    function handleUnauthorized(response, data = null) {
        if (response.status === 401) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem("current_user");
            alert((data && data.detail) || "Your session has expired. Please log in again.");
            window.location.href = "/login";
            return true;
        }
        return false;
    }

    /* -----------------------------
       Elements
    ----------------------------- */
    const transcriptEl = document.getElementById("transcript");
    const transcriptMirrorEl = document.getElementById("transcriptMirror");
    const aiDraftEl = document.getElementById("aiDraft");
    const finalNoteEl = document.getElementById("finalNote");
    const noteTitleEl = document.getElementById("noteTitle");

    const noteModeBadgeEl = document.getElementById("noteModeBadge");
    const saveStateBadgeEl = document.getElementById("saveStateBadge");

    const safeguardingBoxEl = document.getElementById("safeguardingBox");
    const safeguardingTextEl = document.getElementById("safeguardingText");

    const recordingStatusEl = document.getElementById("recordingStatus");
    const recordingTimerEl = document.getElementById("recordingTimer");
    const audioReadyTextEl = document.getElementById("audioReadyText");
    const audioPlaybackEl = document.getElementById("audioPlayback");
    const toastEl = document.getElementById("toast");

    const historyListEl = document.getElementById("historyList");
    const historyEmptyStateEl = document.getElementById("historyEmptyState");
    const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

    const startRecordingBtn = document.getElementById("startRecordingBtn");
    const stopRecordingBtn = document.getElementById("stopRecordingBtn");
    const transcribeBtn = document.getElementById("transcribeBtn");
    const generateBtn = document.getElementById("generateBtn");
    const goToEditBtn = document.getElementById("goToEditBtn");

    const saveBtn = document.getElementById("saveBtn");
    const saveBtnTop = document.getElementById("saveBtnTop");

    const exportBtnTop = document.getElementById("exportBtnTop");
    const printBtnTop = document.getElementById("printBtnTop");

    const exportBtn = document.getElementById("exportBtn");
    const printBtn = document.getElementById("printBtn");
    const copyFinalBtn = document.getElementById("copyFinalBtn");
    const clearBtn = document.getElementById("clearBtn");

    const applyAiEditBtn = document.getElementById("applyAiEditBtn");
    const undoAiEditBtn = document.getElementById("undoAiEditBtn");
    const copyDraftBtn = document.getElementById("copyDraftBtn");
    const aiInstructionEl = document.getElementById("aiInstruction");

    const toggleTranscriptBtn = document.getElementById("toggleTranscriptBtn");
    const transcriptContentEl = document.getElementById("transcriptContent");

    const promptChips = document.querySelectorAll(".prompt-chip");

    const stageTabs = document.querySelectorAll(".stage-tab");
    const stagePanels = document.querySelectorAll(".stage-panel");
    const stageNavItems = document.querySelectorAll("[data-stage-target]");

    const templateSelectEl = document.getElementById("templateSelect");
    const openTemplateManagerBtn = document.getElementById("openTemplateManagerBtn");
    const templateModalEl = document.getElementById("templateModal");
    const closeTemplateManagerBtn = document.getElementById("closeTemplateManagerBtn");
    const templateNameInput = document.getElementById("templateNameInput");
    const newTemplateSectionInput = document.getElementById("newTemplateSectionInput");
    const addTemplateSectionBtn = document.getElementById("addTemplateSectionBtn");
    const templateSectionsListEl = document.getElementById("templateSectionsList");
    const saveTemplateBtn = document.getElementById("saveTemplateBtn");
    const savedTemplatesListEl = document.getElementById("savedTemplatesList");

    const recordingModalEl = document.getElementById("recordingModal");
    const recordingModalMicEl = document.getElementById("recordingModalMic");
    const recordingModalTimerEl = document.getElementById("recordingModalTimer");
    const recordingModalStatusEl = document.getElementById("recordingModalStatus");
    const pauseRecordingBtn = document.getElementById("pauseRecordingBtn");
    const resumeRecordingBtn = document.getElementById("resumeRecordingBtn");
    const stopRecordingModalBtn = document.getElementById("stopRecordingModalBtn");

    /* -----------------------------
       Guard
    ----------------------------- */
    if (!startRecordingBtn || !transcribeBtn || !generateBtn) {
        console.error("AI Notes initialisation failed: required elements missing.");
        return;
    }

    /* -----------------------------
       State
    ----------------------------- */
    const builtInTemplates = [
        {
            id: "general-meeting",
            name: "General meeting",
            sections: ["Meeting Title", "Date", "Attendees", "Summary", "Key Points Discussed", "Decisions Made", "Actions", "Next Steps"]
        },
        {
            id: "supervision",
            name: "Supervision",
            sections: ["Session Overview", "Reflection on Practice", "Strengths", "Areas for Development", "Actions Agreed", "Review Date"]
        },
        {
            id: "incident-review",
            name: "Incident review",
            sections: ["Incident Summary", "What Happened", "Immediate Response", "Discussion", "Learning", "Actions", "Follow-Up"]
        },
        {
            id: "placement-planning",
            name: "Placement planning",
            sections: ["Meeting Overview", "Current Needs", "Risks", "Placement Planning Discussion", "Decisions", "Actions", "Review Date"]
        }
    ];

    let dbTemplates = [];
    let currentTemplateSections = [];
    let latestSafeguardingFlag = false;
    let latestSafeguardingReason = "";

    let mediaRecorder = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordingStream = null;
    let timerInterval = null;
    let recordingSeconds = 0;
    let isRecordingPaused = false;

    let transcriptVisible = true;
    let previousFinalNote = "";
    let openedNoteId = null;

    let autosaveTimeout = null;
    let autosaveEnabled = true;
    let lastSavedSnapshot = "";

    /* -----------------------------
       Helpers
    ----------------------------- */
    function showToast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("show");
        setTimeout(() => toastEl.classList.remove("show"), 2600);
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

    function setSaveState(state, text = "") {
        if (!saveStateBadgeEl) return;

        saveStateBadgeEl.className = `save-state-badge ${state}`;
        saveStateBadgeEl.textContent = text || {
            "is-idle": "Ready",
            "is-dirty": "Unsaved changes",
            "is-saving": "Saving...",
            "is-saved": "Saved"
        }[state] || "Ready";
    }

    function getCurrentSnapshot() {
        return JSON.stringify({
            title: noteTitleEl?.value?.trim() || "",
            transcript: transcriptEl?.value?.trim() || "",
            aiDraft: aiDraftEl?.value?.trim() || "",
            finalNote: finalNoteEl?.value?.trim() || "",
            safeguardingFlag: latestSafeguardingFlag,
            safeguardingReason: latestSafeguardingReason,
            openedNoteId: openedNoteId || null
        });
    }

    function markDirty() {
        if (!autosaveEnabled) return;
        if (getCurrentSnapshot() !== lastSavedSnapshot) {
            setSaveState("is-dirty");
        }
    }

    function rememberSavedSnapshot() {
        lastSavedSnapshot = getCurrentSnapshot();
    }

    function scheduleAutosave() {
        if (!autosaveEnabled) return;

        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
        }

        const finalNote = finalNoteEl?.value?.trim() || "";
        const transcript = transcriptEl?.value?.trim() || "";
        if (!finalNote || !transcript) return;

        autosaveTimeout = setTimeout(() => {
            saveNote(true);
        }, 2500);
    }

    function formatTime(totalSeconds) {
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function updateTimerDisplays(value) {
        if (recordingTimerEl) recordingTimerEl.textContent = value;
        if (recordingModalTimerEl) recordingModalTimerEl.textContent = value;
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
        if (text !== null) button.textContent = text;
    }

    function setStatus(type, text) {
        if (!recordingStatusEl) return;
        recordingStatusEl.textContent = text;
        recordingStatusEl.className = `status-pill ${type}`;
    }

    function setRecordingUI(isRecording) {
        if (isRecording) {
            setStatus("recording", isRecordingPaused ? "Recording paused" : "Recording live");
            updateButtonState(startRecordingBtn, true);
            updateButtonState(stopRecordingBtn, false);
            updateButtonState(transcribeBtn, true);
        } else {
            setStatus("idle", "Not recording");
            updateButtonState(startRecordingBtn, false);
            updateButtonState(stopRecordingBtn, true);
        }
    }

    function setProcessingUI(text = "Processing") {
        setStatus("processing", text);
        safeSetText(recordingModalStatusEl, text);
    }

    function setReadyUI(text = "Ready") {
        setStatus("success", text);
        safeSetText(recordingModalStatusEl, text);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        recordingSeconds = 0;
        updateTimerDisplays("00:00");
    }

    function startTimer() {
        stopTimer();
        timerInterval = setInterval(() => {
            recordingSeconds += 1;
            updateTimerDisplays(formatTime(recordingSeconds));
        }, 1000);
    }

    async function safeJson(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { detail: text || "Invalid server response" };
        }
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

    function escapedTitle(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
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
                        body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; color: #111827; }
                        h1 { font-size: 22px; margin-bottom: 18px; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>${escapedTitle(title)}</h1>
                    <pre>${escaped}</pre>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function deriveTitleFromNote(noteText) {
        const lines = (noteText || "")
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        if (!lines.length) return "";

        const titleLine = lines.find(line => line.toLowerCase().startsWith("meeting title:"));
        if (titleLine) return titleLine.split(":").slice(1).join(":").trim();

        return lines[0].slice(0, 120);
    }

    function getNoteTitleForSave() {
        const manualTitle = noteTitleEl?.value?.trim() || "";
        if (manualTitle) return manualTitle;
        return deriveTitleFromNote(finalNoteEl?.value || "");
    }

    function getSelectedTemplateName() {
        const template = findTemplateById(templateSelectEl?.value);
        return template?.name || "";
    }

    function formatDateTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function setStage(stageName) {
        stageTabs.forEach(tab => {
            tab.classList.toggle("active", tab.dataset.stage === stageName);
        });

        stagePanels.forEach(panel => {
            panel.classList.toggle("active", panel.id === `stage-${stageName}`);
        });

        stageNavItems.forEach(item => {
            item.classList.toggle("nav-item-active", item.dataset.stageTarget === stageName);
        });
    }

    function clearAllFields() {
        const confirmed = window.confirm("Clear the transcript, generated draft and final note?");
        if (!confirmed) return;

        safeSetValue(transcriptEl, "");
        safeSetValue(transcriptMirrorEl, "");
        safeSetValue(aiDraftEl, "");
        safeSetValue(finalNoteEl, "");
        safeSetValue(noteTitleEl, "");
        safeSetValue(aiInstructionEl, "");
        safeSetText(audioReadyTextEl, "No recording yet.");

        if (audioPlaybackEl) {
            audioPlaybackEl.src = "";
            audioPlaybackEl.style.display = "none";
        }

        if (safeguardingBoxEl) safeguardingBoxEl.style.display = "none";
        if (safeguardingTextEl) safeguardingTextEl.textContent = "";

        latestSafeguardingFlag = false;
        latestSafeguardingReason = "";
        previousFinalNote = "";
        recordedBlob = null;
        recordedChunks = [];
        openedNoteId = null;
        isRecordingPaused = false;

        if (autosaveTimeout) {
            clearTimeout(autosaveTimeout);
            autosaveTimeout = null;
        }

        stopTimer();
        resetTimer();
        closeRecordingModal();
        setRecordingUI(false);
        setStage("record");
        updateNoteModeBadge();
        rememberSavedSnapshot();
        setSaveState("is-idle");
        showToast("Cleared");
    }

    function openRecordingModal() {
        recordingModalEl?.classList.remove("hidden");
    }

    function closeRecordingModal() {
        recordingModalEl?.classList.add("hidden");
        recordingModalMicEl?.classList.remove("recording", "paused");
        safeSetText(recordingModalStatusEl, "Recorder ready");
        updateButtonState(pauseRecordingBtn, true, "Pause");
        updateButtonState(resumeRecordingBtn, true, "Resume");
        updateButtonState(stopRecordingModalBtn, true, "Stop");
    }

    function updateRecordingModalUI(state) {
        if (state === "recording") {
            recordingModalMicEl?.classList.add("recording");
            recordingModalMicEl?.classList.remove("paused");
            safeSetText(recordingModalStatusEl, "Recording live");
            updateButtonState(pauseRecordingBtn, false, "Pause");
            updateButtonState(resumeRecordingBtn, true, "Resume");
            updateButtonState(stopRecordingModalBtn, false, "Stop");
        } else if (state === "paused") {
            recordingModalMicEl?.classList.remove("recording");
            recordingModalMicEl?.classList.add("paused");
            safeSetText(recordingModalStatusEl, "Recording paused");
            updateButtonState(pauseRecordingBtn, true, "Pause");
            updateButtonState(resumeRecordingBtn, false, "Resume");
            updateButtonState(stopRecordingModalBtn, false, "Stop");
        } else {
            recordingModalMicEl?.classList.remove("recording", "paused");
            safeSetText(recordingModalStatusEl, "Recorder ready");
            updateButtonState(pauseRecordingBtn, true, "Pause");
            updateButtonState(resumeRecordingBtn, true, "Resume");
            updateButtonState(stopRecordingModalBtn, true, "Stop");
        }
    }

    function getFilenameFromDisposition(disposition, fallback) {
        if (!disposition) return fallback;

        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match && utf8Match[1]) {
            return decodeURIComponent(utf8Match[1]);
        }

        const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
        if (asciiMatch && asciiMatch[1]) {
            return asciiMatch[1];
        }

        return fallback;
    }

    async function downloadExportFile(format) {
        const finalNote = finalNoteEl.value.trim();

        if (!finalNote) {
            alert("There is nothing to export.");
            return;
        }

        const title = getNoteTitleForSave() || "AI Note";
        const templateName = getSelectedTemplateName();

        const form = new FormData();
        form.append("title", title);
        form.append("final_note", finalNote);
        form.append("template_name", templateName);

        try {
            setSaveState("is-saving", `Preparing ${format.toUpperCase()}...`);

            const response = await fetch(`${API_BASE}/ai-notes/export/${format}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            if (!response.ok) {
                const data = await safeJson(response);
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || `Could not export ${format.toUpperCase()}.`);
                setSaveState("is-idle");
                return;
            }

            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition");
            const fallback = `${title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "ai-note"}.${format}`;
            const filename = getFilenameFromDisposition(disposition, fallback);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSaveState("is-saved");
            showToast(`${format.toUpperCase()} export ready`);
        } catch (error) {
            console.error(`Export ${format} error:`, error);
            alert("Could not connect to the export service.");
            setSaveState("is-idle");
        }
    }

    function askExportFormat() {
        const usePdf = window.confirm(
            "Press OK to export as PDF.\nPress Cancel to export as Word DOCX."
        );

        if (usePdf) {
            downloadExportFile("pdf");
        } else {
            downloadExportFile("docx");
        }
    }

    function getAllTemplates() {
        return [...builtInTemplates, ...dbTemplates];
    }

    function renderTemplateOptions() {
        if (!templateSelectEl) return;
        templateSelectEl.innerHTML = getAllTemplates()
            .map(template => `<option value="${template.id}">${escapeHtml(template.name)}</option>`)
            .join("");
    }

    function findTemplateById(templateId) {
        return getAllTemplates().find(template => String(template.id) === String(templateId)) || builtInTemplates[0];
    }

    function renderCurrentTemplateSections() {
        if (!templateSectionsListEl) return;
        templateSectionsListEl.innerHTML = "";

        currentTemplateSections.forEach((section, index) => {
            const row = document.createElement("div");
            row.className = "template-section-chip";
            row.innerHTML = `
                <span>${escapeHtml(section)}</span>
                <button class="btn btn-danger btn-tiny" type="button" data-index="${index}">Remove</button>
            `;
            templateSectionsListEl.appendChild(row);
        });

        templateSectionsListEl.querySelectorAll("[data-index]").forEach(btn => {
            btn.addEventListener("click", () => {
                currentTemplateSections.splice(Number(btn.dataset.index), 1);
                renderCurrentTemplateSections();
            });
        });
    }

    function renderSavedTemplatesList() {
        if (!savedTemplatesListEl) return;

        if (!dbTemplates.length) {
            savedTemplatesListEl.innerHTML = `<div class="saved-template-item"><span>No custom templates yet.</span></div>`;
            return;
        }

        savedTemplatesListEl.innerHTML = "";

        dbTemplates.forEach(template => {
            const item = document.createElement("div");
            item.className = "saved-template-item";
            item.innerHTML = `
                <span>${escapeHtml(template.name)}</span>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-light btn-tiny" type="button" data-edit-id="${template.id}">Edit</button>
                    <button class="btn btn-danger btn-tiny" type="button" data-id="${template.id}">Delete</button>
                </div>
            `;
            savedTemplatesListEl.appendChild(item);
        });

        savedTemplatesListEl.querySelectorAll("[data-id]").forEach(btn => {
            btn.addEventListener("click", async () => {
                await deleteTemplate(btn.dataset.id);
            });
        });

        savedTemplatesListEl.querySelectorAll("[data-edit-id]").forEach(btn => {
            btn.addEventListener("click", async () => {
                await loadTemplateIntoEditor(btn.dataset.editId);
            });
        });
    }

    async function loadTemplates() {
        try {
            const response = await fetch(`${API_BASE}/ai-note-templates`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                throw new Error(data.detail || "Could not load templates");
            }

            dbTemplates = data.templates || [];
            renderTemplateOptions();
            renderSavedTemplatesList();
        } catch (error) {
            console.error("Template load error:", error);
            dbTemplates = [];
            renderTemplateOptions();
            renderSavedTemplatesList();
        }
    }

    function openTemplateModal() {
        if (!templateModalEl) return;
        templateModalEl.classList.remove("hidden");
        if (templateNameInput) templateNameInput.value = "";
        if (newTemplateSectionInput) newTemplateSectionInput.value = "";
        currentTemplateSections = [];
        if (saveTemplateBtn) {
            saveTemplateBtn.dataset.editingTemplateId = "";
            saveTemplateBtn.textContent = "Save template";
        }
        renderCurrentTemplateSections();
        renderSavedTemplatesList();
    }

    function closeTemplateModal() {
        if (!templateModalEl) return;
        templateModalEl.classList.add("hidden");
        if (saveTemplateBtn) {
            saveTemplateBtn.dataset.editingTemplateId = "";
            saveTemplateBtn.textContent = "Save template";
        }
    }

    function addTemplateSection() {
        const value = newTemplateSectionInput?.value.trim();
        if (!value) return;
        currentTemplateSections.push(value);
        newTemplateSectionInput.value = "";
        renderCurrentTemplateSections();
    }

    async function loadTemplateIntoEditor(templateId) {
        try {
            const response = await fetch(`${API_BASE}/ai-note-templates/${templateId}`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Could not load template.");
                return;
            }

            const template = data.template || {};
            openTemplateModal();
            if (templateNameInput) templateNameInput.value = template.name || "";
            currentTemplateSections = Array.isArray(template.sections) ? [...template.sections] : [];
            if (saveTemplateBtn) {
                saveTemplateBtn.dataset.editingTemplateId = String(template.id);
                saveTemplateBtn.textContent = "Update template";
            }
            renderCurrentTemplateSections();
        } catch (error) {
            console.error("Load template error:", error);
            alert("Could not connect to the templates service.");
        }
    }

    async function saveTemplateToDb() {
        const name = templateNameInput?.value.trim();

        if (!name) {
            alert("Please enter a template name.");
            return;
        }

        if (!currentTemplateSections.length) {
            alert("Please add at least one section.");
            return;
        }

        const editingId = saveTemplateBtn?.dataset.editingTemplateId || "";
        const form = new FormData();
        form.append("name", name);
        form.append("sections_json", JSON.stringify(currentTemplateSections));

        const url = editingId
            ? `${API_BASE}/ai-note-templates/update`
            : `${API_BASE}/ai-note-templates`;

        if (editingId) {
            form.append("template_id", editingId);
        }

        const response = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders(),
            body: form
        });

        const data = await safeJson(response);

        if (!response.ok) {
            if (handleUnauthorized(response, data)) return;
            alert(data.detail || "Could not save template.");
            return;
        }

        if (templateNameInput) templateNameInput.value = "";
        if (newTemplateSectionInput) newTemplateSectionInput.value = "";
        currentTemplateSections = [];
        if (saveTemplateBtn) {
            saveTemplateBtn.dataset.editingTemplateId = "";
            saveTemplateBtn.textContent = "Save template";
        }

        renderCurrentTemplateSections();
        await loadTemplates();
        showToast(editingId ? "Template updated" : "Template saved");
    }

    async function deleteTemplate(templateId) {
        const form = new FormData();
        form.append("template_id", templateId);

        const response = await fetch(`${API_BASE}/ai-note-templates/delete`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: form
        });

        const data = await safeJson(response);

        if (!response.ok) {
            if (handleUnauthorized(response, data)) return;
            alert(data.detail || "Could not delete template.");
            return;
        }

        await loadTemplates();
        showToast("Template deleted");
    }

    function buildTemplateInstruction(template) {
        const sectionLines = template.sections.map(section => `- ${section}`).join("\n");
        return `Rewrite this meeting note using the following template structure exactly as section headings. Keep only the facts already present and do not invent information.\n\nTemplate sections:\n${sectionLines}`;
    }

    async function applySelectedTemplateToGeneratedNote(noteText) {
        const selectedTemplate = findTemplateById(templateSelectEl?.value);

        if (!selectedTemplate || selectedTemplate.id === "general-meeting") {
            return noteText;
        }

        const form = new FormData();
        form.append("text", noteText);
        form.append("mode", "custom");
        form.append("instruction", buildTemplateInstruction(selectedTemplate));

        const response = await fetch(`${API_BASE}/ai-notes/edit`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: form
        });

        const data = await safeJson(response);

        if (!response.ok) {
            if (handleUnauthorized(response, data)) {
                throw new Error("Not authenticated");
            }
            throw new Error(data.detail || "Template formatting failed.");
        }

        return data.text || noteText;
    }

    function renderHistory(notes) {
        if (!historyListEl || !historyEmptyStateEl) return;

        historyListEl.innerHTML = "";

        if (!notes || !notes.length) {
            historyEmptyStateEl.style.display = "block";
            historyEmptyStateEl.textContent = "No saved notes yet.";
            return;
        }

        historyEmptyStateEl.style.display = "none";

        notes.forEach(note => {
            const item = document.createElement("div");
            item.className = "history-item";

            const title = escapeHtml(note.title || "Untitled note");
            const updated = formatDateTime(note.updated_at || note.created_at);
            const badge = note.safeguarding_flag
                ? `<div class="history-badge warning">Safeguarding flagged</div>`
                : "";

            item.innerHTML = `
                <div class="history-title">${title}</div>
                <div class="history-meta">Last edited: ${escapeHtml(updated)}</div>
                ${badge}
                <div class="history-actions">
                    <button class="btn btn-light btn-history" data-action="open" data-id="${note.id}" type="button">Open</button>
                    <button class="btn btn-danger btn-history" data-action="delete" data-id="${note.id}" type="button">Delete</button>
                </div>
            `;

            historyListEl.appendChild(item);
        });

        historyListEl.querySelectorAll("[data-action='open']").forEach(btn => {
            btn.addEventListener("click", () => openHistoryNote(btn.getAttribute("data-id")));
        });

        historyListEl.querySelectorAll("[data-action='delete']").forEach(btn => {
            btn.addEventListener("click", () => deleteHistoryNote(btn.getAttribute("data-id")));
        });
    }

    async function loadHistory() {
        try {
            if (refreshHistoryBtn) {
                refreshHistoryBtn.disabled = true;
                refreshHistoryBtn.textContent = "Loading...";
            }

            const response = await fetch(`${API_BASE}/ai-notes/history?limit=10`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                throw new Error(data.detail || "Could not load history.");
            }

            renderHistory(data.notes || []);
        } catch (error) {
            console.error("History load error:", error);
            if (historyEmptyStateEl) {
                historyEmptyStateEl.style.display = "block";
                historyEmptyStateEl.textContent = "Could not load saved notes.";
            }
        } finally {
            if (refreshHistoryBtn) {
                refreshHistoryBtn.disabled = false;
                refreshHistoryBtn.textContent = "Refresh";
            }
        }
    }

    async function openHistoryNote(noteId) {
        if (!noteId) return;

        try {
            const response = await fetch(`${API_BASE}/ai-notes/history/${noteId}`, {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Could not load the saved note.");
                return;
            }

            const note = data.note || {};
            openedNoteId = note.id || null;

            safeSetValue(transcriptEl, note.transcript || "");
            safeSetValue(transcriptMirrorEl, note.transcript || "");
            safeSetValue(aiDraftEl, note.ai_draft || "");
            safeSetValue(finalNoteEl, note.final_note || "");
            safeSetValue(noteTitleEl, note.title || "");

            latestSafeguardingFlag = !!note.safeguarding_flag;
            latestSafeguardingReason = note.safeguarding_reason || "";

            if (safeguardingBoxEl && safeguardingTextEl) {
                safeguardingBoxEl.style.display = "block";
                safeguardingTextEl.textContent = latestSafeguardingFlag
                    ? `Possible safeguarding concern detected: ${latestSafeguardingReason || "Review required."}`
                    : `No safeguarding concern detected: ${latestSafeguardingReason || "None identified."}`;
            }

            updateNoteModeBadge();
            rememberSavedSnapshot();
            setSaveState("is-idle");
            setReadyUI("Saved note loaded");
            setStage("edit");
            showToast("Saved note opened");
        } catch (error) {
            console.error("Open note error:", error);
            alert("Could not connect to the AI notes service.");
        }
    }

    async function deleteHistoryNote(noteId) {
        if (!noteId) return;

        const confirmed = window.confirm("Delete this saved note?");
        if (!confirmed) return;

        try {
            const form = new FormData();
            form.append("note_id", noteId);

            const response = await fetch(`${API_BASE}/ai-notes/delete`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Delete failed.");
                return;
            }

            if (openedNoteId && String(openedNoteId) === String(noteId)) {
                openedNoteId = null;
                clearAllFields();
            }

            showToast("Saved note deleted");
            await loadHistory();
        } catch (error) {
            console.error("Delete note error:", error);
            alert("Could not connect to the AI notes service.");
        }
    }

    async function startRecording() {
        try {
            openedNoteId = null;
            updateNoteModeBadge();

            recordedChunks = [];
            recordedBlob = null;
            isRecordingPaused = false;

            if (audioPlaybackEl) {
                audioPlaybackEl.style.display = "none";
                audioPlaybackEl.src = "";
            }

            safeSetText(audioReadyTextEl, "Recording in progress...");
            updateButtonState(transcribeBtn, true);

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
                updateButtonState(transcribeBtn, false);
                setReadyUI("Recording ready");
                closeRecordingModal();

                if (recordingStream) {
                    recordingStream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            openRecordingModal();
            updateRecordingModalUI("recording");
            setRecordingUI(true);
            setStage("record");
            resetTimer();
            startTimer();
            showToast("Recording started");
        } catch (error) {
            console.error("Microphone error:", error);
            alert("Unable to access microphone. Please allow microphone access in your browser.");
            closeRecordingModal();
        }
    }

    function pauseRecording() {
        if (!mediaRecorder || mediaRecorder.state !== "recording") return;

        mediaRecorder.pause();
        isRecordingPaused = true;
        stopTimer();
        setStatus("processing", "Recording paused");
        updateRecordingModalUI("paused");
        showToast("Recording paused");
    }

    function resumeRecording() {
        if (!mediaRecorder || mediaRecorder.state !== "paused") return;

        mediaRecorder.resume();
        isRecordingPaused = false;
        startTimer();
        setStatus("recording", "Recording live");
        updateRecordingModalUI("recording");
        showToast("Recording resumed");
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        isRecordingPaused = false;
        stopTimer();
        setProcessingUI("Finalising audio");
        updateButtonState(startRecordingBtn, false);
        updateButtonState(stopRecordingBtn, true);
        updateRecordingModalUI("idle");
        showToast("Recording stopped");
    }

    async function transcribeAudio() {
        if (!recordedBlob) {
            alert("Please record audio first.");
            return;
        }

        const form = new FormData();
        form.append("file", recordedBlob, "meeting.webm");

        try {
            setProcessingUI("Transcribing");
            updateButtonState(transcribeBtn, true, "Transcribing...");
            safeSetText(audioReadyTextEl, "Uploading and transcribing audio...");

            const response = await fetch(`${API_BASE}/ai-notes/transcribe`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Transcription failed.");
                setRecordingUI(false);
                return;
            }

            safeSetValue(transcriptEl, data.transcript || "");
            safeSetValue(transcriptMirrorEl, data.transcript || "");
            rememberSavedSnapshot();
            setSaveState("is-idle");
            safeSetText(audioReadyTextEl, "Transcript ready.");
            setReadyUI("Transcript ready");
            setStage("generate");
            showToast("Transcript created");
        } catch (error) {
            console.error("Transcribe error:", error);
            alert("Could not connect to the AI notes service.");
            setRecordingUI(false);
        } finally {
            updateButtonState(transcribeBtn, false, "Transcribe recording");
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
            openedNoteId = null;
            updateNoteModeBadge();

            setProcessingUI("Generating note");
            updateButtonState(generateBtn, true, "Generating...");

            const response = await fetch(`${API_BASE}/ai-notes/generate`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Note generation failed.");
                setRecordingUI(false);
                return;
            }

            let note = data.note || "";
            note = await applySelectedTemplateToGeneratedNote(note);

            safeSetValue(aiDraftEl, note);
            safeSetValue(finalNoteEl, note);

            if (!noteTitleEl.value.trim()) {
                noteTitleEl.value = deriveTitleFromNote(note);
            }

            previousFinalNote = note;
            latestSafeguardingFlag = !!data.safeguarding_flag;
            latestSafeguardingReason = data.safeguarding_reason || "";

            if (safeguardingBoxEl && safeguardingTextEl) {
                safeguardingBoxEl.style.display = "block";
                safeguardingTextEl.textContent = latestSafeguardingFlag
                    ? `Possible safeguarding concern detected: ${latestSafeguardingReason || "Review required."}`
                    : `No safeguarding concern detected: ${latestSafeguardingReason || "None identified."}`;
            }

            rememberSavedSnapshot();
            setSaveState("is-idle");
            setReadyUI("Draft ready");
            setStage("edit");
            showToast("AI draft generated");
        } catch (error) {
            console.error("Generate error:", error);
            alert("Could not connect to the AI notes service.");
            setRecordingUI(false);
        } finally {
            updateButtonState(generateBtn, false, "Generate AI note");
        }
    }

    async function applyAiEdit() {
        const instruction = aiInstructionEl?.value.trim();
        const currentText = finalNoteEl?.value.trim();

        if (!currentText) {
            alert("Generate or open a note first.");
            return;
        }

        if (!instruction) {
            alert("Please type an instruction for the AI.");
            return;
        }

        previousFinalNote = finalNoteEl.value;

        const form = new FormData();
        form.append("text", currentText);
        form.append("mode", "custom");
        form.append("instruction", instruction);

        try {
            setProcessingUI("Applying AI edit");
            updateButtonState(applyAiEditBtn, true, "Applying...");
            setSaveState("is-saving", "Applying AI...");

            const response = await fetch(`${API_BASE}/ai-notes/edit`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "AI edit failed.");
                return;
            }

            finalNoteEl.value = data.text || "";
            markDirty();
            scheduleAutosave();
            showToast("AI edit applied");
        } catch (error) {
            console.error("AI edit error:", error);
            alert("Could not connect to the AI notes service.");
        } finally {
            updateButtonState(applyAiEditBtn, false, "Apply AI edit");
            setReadyUI("Document updated");
        }
    }

    function undoAiEdit() {
        if (!previousFinalNote) {
            alert("There is no previous version to restore.");
            return;
        }

        finalNoteEl.value = previousFinalNote;
        markDirty();
        scheduleAutosave();
        showToast("Last edit undone");
    }

    function resetFromGeneratedDraft() {
        if (!aiDraftEl.value.trim()) {
            alert("There is no generated draft to restore.");
            return;
        }

        finalNoteEl.value = aiDraftEl.value;
        markDirty();
        scheduleAutosave();
        showToast("Document reset from generated draft");
    }

    async function saveNote(isAutosave = false) {
        const transcript = transcriptEl.value.trim();
        const aiDraft = aiDraftEl.value.trim() || finalNoteEl.value.trim();
        const finalNote = finalNoteEl.value.trim();

        if (!transcript || !aiDraft || !finalNote) {
            if (!isAutosave) {
                alert("Transcript, generated draft and final note are required.");
            }
            return;
        }

        const title = getNoteTitleForSave();
        const safeguardingReasonForSave =
            latestSafeguardingReason ||
            safeguardingTextEl?.textContent ||
            "";

        const form = new FormData();
        form.append("transcript", transcript);
        form.append("ai_draft", aiDraft);
        form.append("final_note", finalNote);
        form.append("safeguarding_flag", String(latestSafeguardingFlag));
        form.append("safeguarding_reason", safeguardingReasonForSave);
        form.append("title", title);

        if (openedNoteId) {
            form.append("note_id", String(openedNoteId));
        }

        try {
            setProcessingUI("Saving");
            setSaveState("is-saving");

            if (!isAutosave) {
                updateButtonState(saveBtn, true, "Saving...");
                updateButtonState(saveBtnTop, true, "Saving...");
            }

            const response = await fetch(`${API_BASE}/ai-notes/save`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                if (!isAutosave) {
                    alert(data.detail || "Save failed.");
                }
                setSaveState("is-dirty", "Save failed");
                setRecordingUI(false);
                return;
            }

            if (data.record && data.record.id) {
                openedNoteId = data.record.id;
            }

            updateNoteModeBadge();
            rememberSavedSnapshot();
            setSaveState("is-saved");
            setReadyUI(data.updated ? "Updated" : "Saved");

            if (!isAutosave) {
                showToast(data.updated ? "AI note updated successfully" : "AI note saved successfully");
            }

            await loadHistory();
        } catch (error) {
            console.error("Save error:", error);
            if (!isAutosave) {
                alert("Could not connect to the AI notes service.");
            }
            setSaveState("is-dirty", "Save failed");
            setRecordingUI(false);
        } finally {
            if (!isAutosave) {
                updateButtonState(saveBtn, false, "Save note");
                updateButtonState(saveBtnTop, false, "Save");
            }
        }
    }

    function toggleTranscript() {
        transcriptVisible = !transcriptVisible;
        transcriptContentEl?.classList.toggle("hidden", !transcriptVisible);
        if (toggleTranscriptBtn) toggleTranscriptBtn.textContent = "Show / hide";
    }

    function bindStageNavigation() {
        stageTabs.forEach(tab => {
            tab.addEventListener("click", () => setStage(tab.dataset.stage));
        });

        stageNavItems.forEach(item => {
            item.addEventListener("click", () => setStage(item.dataset.stageTarget));
        });
    }

    function bindPromptChips() {
        promptChips.forEach(chip => {
            chip.addEventListener("click", () => {
                if (aiInstructionEl) {
                    aiInstructionEl.value = chip.dataset.prompt || "";
                    aiInstructionEl.focus();
                }
            });
        });
    }

    function bindTemplateManager() {
        openTemplateManagerBtn?.addEventListener("click", openTemplateModal);
        closeTemplateManagerBtn?.addEventListener("click", closeTemplateModal);

        templateModalEl?.addEventListener("click", (event) => {
            if (event.target === templateModalEl) {
                closeTemplateModal();
            }
        });

        addTemplateSectionBtn?.addEventListener("click", addTemplateSection);
        saveTemplateBtn?.addEventListener("click", saveTemplateToDb);
    }

    function bindDirtyTracking() {
        [transcriptEl, transcriptMirrorEl, finalNoteEl, noteTitleEl].forEach(el => {
            el?.addEventListener("input", () => {
                if (el === transcriptEl && transcriptMirrorEl) {
                    transcriptMirrorEl.value = transcriptEl.value;
                }
                markDirty();
                scheduleAutosave();
            });
        });
    }

    function bindButtons() {
        startRecordingBtn?.addEventListener("click", startRecording);
        stopRecordingBtn?.addEventListener("click", stopRecording);
        stopRecordingModalBtn?.addEventListener("click", stopRecording);
        pauseRecordingBtn?.addEventListener("click", pauseRecording);
        resumeRecordingBtn?.addEventListener("click", resumeRecording);

        transcribeBtn?.addEventListener("click", transcribeAudio);
        generateBtn?.addEventListener("click", generateNote);
        goToEditBtn?.addEventListener("click", () => setStage("edit"));

        applyAiEditBtn?.addEventListener("click", applyAiEdit);
        undoAiEditBtn?.addEventListener("click", undoAiEdit);
        copyDraftBtn?.addEventListener("click", resetFromGeneratedDraft);

        saveBtn?.addEventListener("click", () => saveNote(false));
        saveBtnTop?.addEventListener("click", () => saveNote(false));

        copyFinalBtn?.addEventListener("click", () => copyText(finalNoteEl.value, "Final note copied"));

        printBtn?.addEventListener("click", () => {
            const title = getNoteTitleForSave() || "AI Note";
            printText(title, finalNoteEl.value);
        });

        printBtnTop?.addEventListener("click", () => {
            const title = getNoteTitleForSave() || "AI Note";
            printText(title, finalNoteEl.value);
        });

        exportBtn?.addEventListener("click", askExportFormat);
        exportBtnTop?.addEventListener("click", askExportFormat);

        clearBtn?.addEventListener("click", clearAllFields);
        toggleTranscriptBtn?.addEventListener("click", toggleTranscript);
        refreshHistoryBtn?.addEventListener("click", loadHistory);
    }

    async function init() {
        if (!getAccessToken()) {
            window.location.href = "/login";
            return;
        }

        bindButtons();
        bindStageNavigation();
        bindPromptChips();
        bindTemplateManager();
        bindDirtyTracking();

        resetTimer();
        closeRecordingModal();
        setRecordingUI(false);
        setStage("record");
        updateNoteModeBadge();

        if (safeguardingBoxEl) {
            safeguardingBoxEl.style.display = "none";
        }

        rememberSavedSnapshot();
        setSaveState("is-idle");

        await loadTemplates();
        await loadHistory();
    }

    init();
});
