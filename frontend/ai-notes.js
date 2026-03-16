document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";
    const LOCAL_TEMPLATE_KEY = "indicare_custom_templates_v2";
    const LOCAL_DRAFT_KEY = "indicare_ai_notes_draft_v2";
    const LOCAL_HISTORY_KEY = "indicare_ai_notes_history_v2";

    const startRecordingBtn = document.getElementById("startRecordingBtn");
    const stopRecordingBtn = document.getElementById("stopRecordingBtn");
    const transcribeBtn = document.getElementById("transcribeBtn");
    const generateBtn = document.getElementById("generateBtn");

    const saveBtn = document.getElementById("saveBtn");
    const exportBtn = document.getElementById("exportBtn");
    const printBtn = document.getElementById("printBtn");
    const clearBtn = document.getElementById("clearBtn");

    const saveBtnTop = document.getElementById("saveBtnTop");
    const exportBtnTop = document.getElementById("exportBtnTop");
    const printBtnTop = document.getElementById("printBtnTop");

    const applyAiEditBtn = document.getElementById("applyAiEditBtn");
    const undoAiEditBtn = document.getElementById("undoAiEditBtn");
    const copyFinalBtn = document.getElementById("copyFinalBtn");
    const copyDraftBtn = document.getElementById("copyDraftBtn");
    const insertTemplateBtn = document.getElementById("insertTemplateBtn");

    const audioPlaybackEl = document.getElementById("audioPlayback");
    const transcriptEl = document.getElementById("transcript");
    const finalNoteEl = document.getElementById("finalNote");
    const noteTitleEl = document.getElementById("noteTitle");
    const aiInstructionEl = document.getElementById("aiInstruction");
    const templateSelectEl = document.getElementById("templateSelect");
    const aiDraftEl = document.getElementById("aiDraft");
    const transcriptMirrorEl = document.getElementById("transcriptMirror");

    const serviceTypeEl = document.getElementById("serviceType");
    const shiftTypeEl = document.getElementById("shiftType");
    const recordAuthorEl = document.getElementById("recordAuthor");
    const youngPersonNameEl = document.getElementById("youngPersonName");
    const meetingDateEl = document.getElementById("meetingDate");

    const recordingStatusEl = document.getElementById("recordingStatus");
    const recordingTimerEl = document.getElementById("recordingTimer");
    const statusIndicatorDotEl = document.getElementById("statusIndicatorDot");
    const audioReadyTextEl = document.getElementById("audioReadyText");

    const noteModeBadgeEl = document.getElementById("noteModeBadge");
    const saveStateBadgeEl = document.getElementById("saveStateBadge");
    const documentQualityBadgeEl = document.getElementById("documentQualityBadge");

    const safeguardingBoxEl = document.getElementById("safeguardingBox");
    const safeguardingTextEl = document.getElementById("safeguardingText");

    const historyListEl = document.getElementById("historyList");
    const historyEmptyStateEl = document.getElementById("historyEmptyState");
    const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

    const toastEl = document.getElementById("toast");

    const toggleTranscriptBtn = document.getElementById("toggleTranscriptBtn");
    const transcriptContentEl = document.getElementById("transcriptContent");

    const templateModalEl = document.getElementById("templateModal");
    const openTemplateManagerBtn = document.getElementById("openTemplateManagerBtn");
    const closeTemplateManagerBtn = document.getElementById("closeTemplateManagerBtn");
    const templateNameInputEl = document.getElementById("templateNameInput");
    const templateSectionsListEl = document.getElementById("templateSectionsList");
    const newTemplateSectionInputEl = document.getElementById("newTemplateSectionInput");
    const addTemplateSectionBtn = document.getElementById("addTemplateSectionBtn");
    const saveTemplateBtn = document.getElementById("saveTemplateBtn");
    const savedTemplatesListEl = document.getElementById("savedTemplatesList");

    const recordingModalEl = document.getElementById("recordingModal");
    const recordingModalMicEl = document.getElementById("recordingModalMic");
    const recordingModalTimerEl = document.getElementById("recordingModalTimer");
    const recordingModalStatusEl = document.getElementById("recordingModalStatus");
    const pauseRecordingBtn = document.getElementById("pauseRecordingBtn");
    const resumeRecordingBtn = document.getElementById("resumeRecordingBtn");

    const workflowModalEl = document.getElementById("workflowModal");
    const closeWorkflowModalBtn = document.getElementById("closeWorkflowModalBtn");
    const workflowTemplateTextEl = document.getElementById("workflowTemplateText");
    const workflowStatusTextEl = document.getElementById("workflowStatusText");
    const workflowSaveTextEl = document.getElementById("workflowSaveText");

    const builtInTemplates = [
        {
            id: "daily-care-note",
            name: "Daily care note",
            sections: [
                "Record Title",
                "Date",
                "Person Supported / Young Person",
                "Staff Recording",
                "Context",
                "Presentation and Mood",
                "Daily Living and Independence",
                "Health and Wellbeing",
                "Medication",
                "Education / Employment / Activities",
                "Relationships / Family Contact",
                "Incidents / Significant Events",
                "Safeguarding / Risks",
                "Actions Taken",
                "Outcome / Next Steps"
            ]
        },
        {
            id: "shift-handover",
            name: "Shift handover",
            sections: [
                "Shift",
                "Date",
                "Staff on Duty",
                "Overview",
                "Presentation",
                "Health",
                "Medication",
                "Education / Appointments",
                "Behaviour / Incidents",
                "Family / Professional Contact",
                "Risks / Concerns",
                "Tasks for Next Shift",
                "Manager / Senior Notes"
            ]
        },
        {
            id: "incident-record",
            name: "Incident record",
            sections: [
                "Incident Title",
                "Date and Time",
                "Location",
                "People Involved",
                "Presenting Situation",
                "Factual Account",
                "Staff Response",
                "De-escalation / Intervention",
                "Outcome",
                "Injuries / Damage",
                "Notifications Made",
                "Safeguarding Considerations",
                "Learning",
                "Follow-Up Actions"
            ]
        },
        {
            id: "supervision-note",
            name: "Staff supervision note",
            sections: [
                "Supervision Title",
                "Date",
                "Supervisor",
                "Supervisee",
                "Purpose",
                "Topics Discussed",
                "Reflection on Practice",
                "Strengths",
                "Areas for Development",
                "Safeguarding / Compliance Discussion",
                "Actions Agreed",
                "Review Date"
            ]
        },
        {
            id: "keywork-session",
            name: "Key-work session note",
            sections: [
                "Session Title",
                "Date",
                "Young Person",
                "Staff Member",
                "Purpose of Session",
                "Topics Discussed",
                "Young Person Views, Wishes and Feelings",
                "Presentation During Session",
                "Advice / Guidance Given",
                "Agreements Made",
                "Actions / Follow-Up"
            ]
        },
        {
            id: "safeguarding-discussion",
            name: "Safeguarding discussion record",
            sections: [
                "Record Title",
                "Date",
                "People Involved",
                "Nature of Concern",
                "What Was Seen / Heard / Shared",
                "Immediate Safety Actions",
                "Who Was Informed",
                "Professional Discussion",
                "Decision / Threshold Consideration",
                "Next Steps",
                "Management Oversight"
            ]
        }
    ];

    const safeguardingKeywords = [
        "safeguarding", "assault", "self-harm", "self harm", "suicide", "sexual",
        "neglect", "abuse", "missing", "police", "injury", "restraint", "physical intervention",
        "knife", "weapon", "overdose", "exploitation", "violence", "threat", "bruise", "disclosure"
    ];

    const personCentredKeywords = [
        "wishes", "feelings", "views", "choices", "voice", "presentation", "consent",
        "engagement", "supported", "encouraged", "offered", "agreed"
    ];

    let mediaRecorder = null;
    let recordingStream = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordingMimeType = "";
    let recordingExtension = "webm";
    let previousFinalNote = "";
    let previousAiDraft = "";
    let currentTimerInterval = null;
    let recordingStartTime = null;
    let pausedAt = null;
    let totalPausedMs = 0;
    let customTemplates = [];
    let templateBuilderSections = [];
    let autosaveTimeout = null;
    let currentNoteId = null;
    let isTranscriptVisible = true;

    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAccessToken();
        return token ? { ...extraHeaders, Authorization: `Bearer ${token}` } : { ...extraHeaders };
    }

    function redirectToLogin() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem("current_user");
        window.location.href = "/login";
    }

    function handleUnauthorized(response, data = null) {
        if (response.status === 401) {
            alert((data && data.detail) || "Your session has expired. Please log in again.");
            redirectToLogin();
            return true;
        }
        return false;
    }

    async function safeJson(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { detail: text || "Invalid server response" };
        }
    }

    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => toastEl.classList.remove("show"), 2600);
    }

    function setStatus(mode, label) {
        recordingStatusEl.textContent = label;
        recordingStatusEl.className = `status-pill ${mode}`;
        statusIndicatorDotEl.className = `live-dot ${mode}`;
        if (workflowStatusTextEl) workflowStatusTextEl.textContent = label;
    }

    function setSaveState(state, label) {
        if (!saveStateBadgeEl) return;
        saveStateBadgeEl.className = `save-state-badge ${state}`;
        saveStateBadgeEl.textContent = label;
        if (workflowSaveTextEl) workflowSaveTextEl.textContent = label;
    }

    function setNoteMode(isEditing) {
        noteModeBadgeEl.className = isEditing ? "note-mode-badge is-editing" : "note-mode-badge is-new";
        noteModeBadgeEl.textContent = isEditing ? "Editing saved note" : "New unsaved note";
    }

    function formatTime(totalSeconds) {
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function getElapsedRecordingSeconds() {
        if (!recordingStartTime) return 0;
        const now = pausedAt || Date.now();
        return Math.max(0, Math.floor((now - recordingStartTime - totalPausedMs) / 1000));
    }

    function startRecordingTimer() {
        stopRecordingTimer();
        recordingStartTime = Date.now();
        totalPausedMs = 0;
        pausedAt = null;

        currentTimerInterval = setInterval(() => {
            const formatted = formatTime(getElapsedRecordingSeconds());
            recordingTimerEl.textContent = formatted;
            recordingModalTimerEl.textContent = formatted;
        }, 250);
    }

    function stopRecordingTimer() {
        if (currentTimerInterval) {
            clearInterval(currentTimerInterval);
            currentTimerInterval = null;
        }
    }

    function openRecordingModal() {
        recordingModalEl.classList.remove("hidden");
        recordingModalMicEl.classList.add("recording");
        recordingModalMicEl.classList.remove("paused");
        recordingModalStatusEl.textContent = "Recording live";
        pauseRecordingBtn.disabled = false;
        resumeRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
    }

    function closeRecordingModal() {
        recordingModalEl.classList.add("hidden");
        recordingModalMicEl.classList.remove("recording", "paused");
        pauseRecordingBtn.disabled = true;
        resumeRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = true;
    }

    function openWorkflowModal() {
        workflowModalEl.classList.remove("hidden");
    }

    function closeWorkflowModal() {
        workflowModalEl.classList.add("hidden");
    }

    function getSupportedRecordingOptions() {
        const candidates = [
            { mimeType: "audio/webm;codecs=opus", extension: "webm" },
            { mimeType: "audio/webm", extension: "webm" },
            { mimeType: "audio/mp4", extension: "mp4" },
            { mimeType: "audio/ogg;codecs=opus", extension: "ogg" }
        ];

        for (const option of candidates) {
            if (window.MediaRecorder && MediaRecorder.isTypeSupported(option.mimeType)) return option;
        }

        return { mimeType: "", extension: "webm" };
    }

    function getLocalTemplates() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_TEMPLATE_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function saveLocalTemplates(templates) {
        localStorage.setItem(LOCAL_TEMPLATE_KEY, JSON.stringify(templates));
    }

    function getAllTemplates() {
        return [...builtInTemplates, ...customTemplates];
    }

    function populateTemplates() {
        const allTemplates = getAllTemplates();
        templateSelectEl.innerHTML = allTemplates.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
        updateSelectedTemplateUI();
    }

    function getSelectedTemplate() {
        const selectedId = templateSelectEl.value;
        return getAllTemplates().find(t => t.id === selectedId) || getAllTemplates()[0];
    }

    function updateSelectedTemplateUI() {
        const template = getSelectedTemplate();
        if (workflowTemplateTextEl) workflowTemplateTextEl.textContent = template?.name || "—";
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "").split("\n").map(line => line.trim()).find(Boolean);
        return firstLine ? firstLine.replace(/[:#*-]/g, "").slice(0, 120) : "Care record";
    }

    function buildCareContextBlock() {
        return [
            `Service type: ${serviceTypeEl.value || "Not specified"}`,
            `Shift or context: ${shiftTypeEl.value || "Not specified"}`,
            `Recorded by: ${recordAuthorEl.value.trim() || "Not specified"}`,
            `Person supported / young person: ${youngPersonNameEl.value.trim() || "Not specified"}`,
            `Record date: ${meetingDateEl.value || "Not specified"}`
        ].join("\n");
    }

    function buildTemplateInstruction(template) {
        return [
            "Rewrite this into a high-quality professional care sector document.",
            "Use clear, factual, respectful, person-centred language.",
            "Do not invent facts.",
            "Keep chronology clear.",
            "Separate observed facts, reported information, actions taken, and next steps where possible.",
            "",
            "Care context:",
            buildCareContextBlock(),
            "",
            "Use these exact headings:",
            ...template.sections.map(section => `- ${section}`)
        ].join("\n");
    }

    function buildAiInstruction(userInstruction) {
        return [
            userInstruction,
            "",
            "Additional rules:",
            "- Keep the content factual and professional.",
            "- Do not add information that was not provided.",
            "- Use care-sector language suitable for records, supervision, handover, or safeguarding review as relevant.",
            "- Preserve important details, names, dates, risks, actions, and professional decisions."
        ].join("\n");
    }

    function syncMirrors() {
        aiDraftEl.value = finalNoteEl.value || "";
        transcriptMirrorEl.value = transcriptEl.value || "";
    }

    function analyseDocument() {
        const text = finalNoteEl.value || "";
        const lower = text.toLowerCase();

        const safeguardingMatches = safeguardingKeywords.filter(k => lower.includes(k));
        if (safeguardingMatches.length) {
            safeguardingBoxEl.classList.remove("hidden");
            safeguardingTextEl.textContent =
                `Potential safeguarding or risk-related language found: ${[...new Set(safeguardingMatches)].join(", ")}. Review the final note carefully before saving.`;
        } else {
            safeguardingBoxEl.classList.add("hidden");
            safeguardingTextEl.textContent = "";
        }

        const hasPersonCentred = personCentredKeywords.some(k => lower.includes(k));
        documentQualityBadgeEl.textContent = hasPersonCentred ? "Person-centred draft" : "Care draft";

        syncMirrors();
    }

    function setDirtyState() {
        setSaveState("is-dirty", "Unsaved changes");
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(() => {
            persistDraftLocally();
        }, 500);
    }

    function persistDraftLocally() {
        const payload = {
            transcript: transcriptEl.value || "",
            finalNote: finalNoteEl.value || "",
            aiDraft: aiDraftEl.value || "",
            noteTitle: noteTitleEl.value || "",
            aiInstruction: aiInstructionEl.value || "",
            templateId: templateSelectEl.value || "",
            serviceType: serviceTypeEl.value || "",
            shiftType: shiftTypeEl.value || "",
            recordAuthor: recordAuthorEl.value || "",
            youngPersonName: youngPersonNameEl.value || "",
            meetingDate: meetingDateEl.value || "",
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
    }

    function restoreLocalDraft() {
        try {
            const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);

            transcriptEl.value = draft.transcript || "";
            finalNoteEl.value = draft.finalNote || "";
            aiDraftEl.value = draft.aiDraft || draft.finalNote || "";
            noteTitleEl.value = draft.noteTitle || "";
            aiInstructionEl.value = draft.aiInstruction || "";
            recordAuthorEl.value = draft.recordAuthor || "";
            youngPersonNameEl.value = draft.youngPersonName || "";
            meetingDateEl.value = draft.meetingDate || "";
            serviceTypeEl.value = draft.serviceType || serviceTypeEl.value;
            shiftTypeEl.value = draft.shiftType || shiftTypeEl.value;
            if (draft.templateId && templateSelectEl.querySelector(`option[value="${draft.templateId}"]`)) {
                templateSelectEl.value = draft.templateId;
            }

            updateSelectedTemplateUI();
            analyseDocument();
        } catch (error) {
            console.warn("Could not restore draft", error);
        }
    }

    function getLocalHistory() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function setLocalHistory(items) {
        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
    }

    function addToLocalHistory(item) {
        const next = [
            {
                id: item.id || `note-${Date.now()}`,
                title: item.title || "Untitled care note",
                templateName: item.templateName || getSelectedTemplate()?.name || "Unknown template",
                updatedAt: new Date().toISOString(),
                excerpt: (item.finalNote || "").slice(0, 180),
                finalNote: item.finalNote || "",
                transcript: item.transcript || ""
            },
            ...getLocalHistory().filter(x => x.id !== item.id)
        ].slice(0, 12);

        setLocalHistory(next);
        renderHistory();
    }

    function renderHistory() {
        const items = getLocalHistory();
        historyListEl.innerHTML = "";

        if (!items.length) {
            historyEmptyStateEl.style.display = "block";
            return;
        }

        historyEmptyStateEl.style.display = "none";

        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "history-item";
            card.innerHTML = `
                <div class="history-title">${escapeHtml(item.title)}</div>
                <div class="history-meta">${escapeHtml(item.templateName)} · ${new Date(item.updatedAt).toLocaleString("en-GB")}</div>
                <div class="history-meta">${escapeHtml(item.excerpt || "No preview available.")}</div>
                <div class="history-actions">
                    <button class="btn btn-light btn-tiny" type="button" data-history-open="${item.id}">Open</button>
                    <button class="btn btn-light btn-tiny" type="button" data-history-copy="${item.id}">Copy</button>
                </div>
            `;
            historyListEl.appendChild(card);
        });
    }

    function openHistoryItem(id) {
        const item = getLocalHistory().find(x => x.id === id);
        if (!item) return;

        currentNoteId = item.id;
        noteTitleEl.value = item.title || "";
        transcriptEl.value = item.transcript || "";
        finalNoteEl.value = item.finalNote || "";
        aiDraftEl.value = item.finalNote || "";
        setNoteMode(true);
        analyseDocument();
        openWorkflowModal();
        showToast("Recent note opened.");
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard.");
        } catch {
            alert("Could not copy to clipboard.");
        }
    }

    async function startRecording() {
        try {
            recordedChunks = [];
            recordedBlob = null;

            if (audioPlaybackEl) {
                audioPlaybackEl.src = "";
                audioPlaybackEl.style.display = "none";
            }

            const option = getSupportedRecordingOptions();
            recordingMimeType = option.mimeType;
            recordingExtension = option.extension;

            recordingStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            mediaRecorder = recordingMimeType
                ? new MediaRecorder(recordingStream, { mimeType: recordingMimeType })
                : new MediaRecorder(recordingStream);

            mediaRecorder.ondataavailable = event => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (!recordedChunks.length) {
                    alert("No recording captured. Please try again.");
                    resetRecordingUi();
                    return;
                }

                recordedBlob = new Blob(recordedChunks, { type: recordingMimeType || "audio/webm" });

                audioPlaybackEl.src = URL.createObjectURL(recordedBlob);
                audioPlaybackEl.style.display = "block";

                if (audioReadyTextEl) {
                    audioReadyTextEl.textContent = `Recording ready (${formatTime(getElapsedRecordingSeconds())}).`;
                }

                if (recordingStream) {
                    recordingStream.getTracks().forEach(track => track.stop());
                }

                transcribeBtn.disabled = false;
                resetRecordingUi();
                openWorkflowModal();
                setStatus("success", "Recording complete");
                showToast("Recording complete. AI workspace opened.");
            };

            mediaRecorder.onerror = () => {
                alert("Recording failed. Please try again.");
                resetRecordingUi();
            };

            mediaRecorder.start(1000);
            startRecordingBtn.disabled = true;
            setStatus("recording", "Recording live");
            startRecordingTimer();
            openRecordingModal();
            showToast("Recording started.");
        } catch (error) {
            console.error("Recording error:", error);
            alert("Unable to access the microphone. Please allow microphone access in your browser.");
        }
    }

    function pauseRecording() {
        if (!mediaRecorder || mediaRecorder.state !== "recording") return;
        mediaRecorder.pause();
        pausedAt = Date.now();
        recordingModalMicEl.classList.remove("recording");
        recordingModalMicEl.classList.add("paused");
        recordingModalStatusEl.textContent = "Recording paused";
        pauseRecordingBtn.disabled = true;
        resumeRecordingBtn.disabled = false;
    }

    function resumeRecording() {
        if (!mediaRecorder || mediaRecorder.state !== "paused") return;
        mediaRecorder.resume();
        if (pausedAt) {
            totalPausedMs += Date.now() - pausedAt;
            pausedAt = null;
        }
        recordingModalMicEl.classList.remove("paused");
        recordingModalMicEl.classList.add("recording");
        recordingModalStatusEl.textContent = "Recording live";
        pauseRecordingBtn.disabled = false;
        resumeRecordingBtn.disabled = true;
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            if (pausedAt) {
                totalPausedMs += Date.now() - pausedAt;
                pausedAt = null;
            }
            mediaRecorder.stop();
        }
    }

    function resetRecordingUi() {
        stopRecordingTimer();
        closeRecordingModal();
        startRecordingBtn.disabled = false;
        recordingTimerEl.textContent = "00:00";
        recordingModalTimerEl.textContent = "00:00";
    }

    async function transcribeAudio() {
        if (!recordedBlob) {
            alert("Please record audio first.");
            return;
        }

        if (recordedBlob.size < 1000) {
            alert("The recording appears too short or empty. Please record again.");
            return;
        }

        const filename = `care-note.${recordingExtension || "webm"}`;
        const form = new FormData();
        form.append("file", recordedBlob, filename);

        try {
            transcribeBtn.disabled = true;
            transcribeBtn.textContent = "Transcribing...";
            setStatus("processing", "Transcribing recording");

            const response = await fetch("/ai-notes/transcribe", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Transcription failed.");
                return;
            }

            const transcript = data.transcript || "";
            transcriptEl.value = transcript;
            finalNoteEl.value = transcript;
            aiDraftEl.value = transcript;
            previousFinalNote = transcript;
            previousAiDraft = transcript;

            if (!noteTitleEl.value.trim()) {
                noteTitleEl.value = `Care note - ${new Date().toLocaleDateString("en-GB")}`;
            }

            analyseDocument();
            setStatus("success", "Transcript ready");
            setDirtyState();
            showToast("Transcription complete.");
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Could not connect to the transcription service.");
            setStatus("idle", "Ready");
        } finally {
            transcribeBtn.disabled = false;
            transcribeBtn.textContent = "Transcribe recording";
        }
    }

    async function generateWorkingDocument() {
        const transcript = transcriptEl.value.trim();
        if (!transcript) {
            alert("Please transcribe audio first or paste a transcript.");
            return;
        }

        const template = getSelectedTemplate();
        const form = new FormData();
        form.append("text", transcript);
        form.append("mode", "custom");
        form.append("instruction", buildTemplateInstruction(template));

        try {
            generateBtn.disabled = true;
            generateBtn.textContent = "Generating...";
            setStatus("processing", "Generating document");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Document generation failed.");
                return;
            }

            const generated = data.text || transcript;
            previousFinalNote = finalNoteEl.value || transcript;
            previousAiDraft = generated;
            finalNoteEl.value = generated;
            aiDraftEl.value = generated;

            if (!noteTitleEl.value.trim()) {
                noteTitleEl.value = deriveTitleFromText(generated);
            }

            analyseDocument();
            setStatus("success", "Document generated");
            setDirtyState();
            showToast("Care document generated.");
        } catch (error) {
            console.error("Generate document error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Ready");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate care document";
        }
    }

    function insertBlankTemplate() {
        const template = getSelectedTemplate();
        finalNoteEl.value = template.sections.map(section => `${section}\n`).join("\n").trim();
        analyseDocument();
        setDirtyState();
        showToast("Blank template inserted.");
    }

    async function applyAiChange() {
        const instruction = aiInstructionEl.value.trim();
        const currentText = finalNoteEl.value.trim();

        if (!currentText) {
            alert("There is no document to edit yet.");
            return;
        }

        if (!instruction) {
            alert("Please type an instruction for AI.");
            return;
        }

        previousFinalNote = finalNoteEl.value;

        const form = new FormData();
        form.append("text", currentText);
        form.append("mode", "custom");
        form.append("instruction", buildAiInstruction(instruction));

        try {
            applyAiEditBtn.disabled = true;
            applyAiEditBtn.textContent = "Applying...";
            setStatus("processing", "Applying AI changes");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "AI change failed.");
                return;
            }

            finalNoteEl.value = data.text || currentText;
            analyseDocument();
            setDirtyState();
            setStatus("success", "AI update applied");
            showToast("AI change applied.");
        } catch (error) {
            console.error("Apply AI change error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Ready");
        } finally {
            applyAiEditBtn.disabled = false;
            applyAiEditBtn.textContent = "Apply AI change";
        }
    }

    function undoLastChange() {
        if (!previousFinalNote) {
            alert("There is no previous version to restore.");
            return;
        }
        finalNoteEl.value = previousFinalNote;
        analyseDocument();
        setDirtyState();
        showToast("Last change undone.");
    }

    function resetFromGeneratedDraft() {
        if (!aiDraftEl.value.trim()) {
            alert("There is no generated draft to restore.");
            return;
        }
        previousFinalNote = finalNoteEl.value;
        finalNoteEl.value = aiDraftEl.value;
        analyseDocument();
        setDirtyState();
        showToast("Draft restored.");
    }

    async function saveDocument() {
        const transcript = transcriptEl.value.trim();
        const finalNote = finalNoteEl.value.trim();
        const title = noteTitleEl.value.trim() || deriveTitleFromText(finalNote);

        if (!transcript) {
            alert("Transcript is required.");
            return;
        }
        if (!finalNote) {
            alert("Editable document is required.");
            return;
        }

        const form = new FormData();
        form.append("transcript", transcript);
        form.append("ai_draft", aiDraftEl.value.trim() || finalNote);
        form.append("final_note", finalNote);
        form.append("title", title);
        form.append("template_name", getSelectedTemplate()?.name || "");
        form.append("service_type", serviceTypeEl.value || "");
        form.append("shift_type", shiftTypeEl.value || "");
        form.append("record_author", recordAuthorEl.value || "");
        form.append("young_person_name", youngPersonNameEl.value || "");
        form.append("record_date", meetingDateEl.value || "");

        try {
            saveBtn.disabled = true;
            saveBtnTop.disabled = true;
            setSaveState("is-saving", "Saving...");

            const response = await fetch("/ai-notes/save", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Save failed.");
                setSaveState("is-dirty", "Unsaved changes");
                return;
            }

            currentNoteId = data.id || currentNoteId || `note-${Date.now()}`;
            setNoteMode(true);
            setSaveState("is-saved", "Saved");
            addToLocalHistory({
                id: currentNoteId,
                title,
                templateName: getSelectedTemplate()?.name || "",
                finalNote,
                transcript
            });

            showToast("Document saved successfully.");
        } catch (error) {
            console.error("Save error:", error);
            alert("Could not connect to the save service.");
            setSaveState("is-dirty", "Unsaved changes");
        } finally {
            saveBtn.disabled = false;
            saveBtnTop.disabled = false;
        }
    }

    async function exportDocument() {
        const finalNote = finalNoteEl.value.trim();
        const title = noteTitleEl.value.trim() || "Care Note";

        if (!finalNote) {
            alert("There is nothing to export.");
            return;
        }

        const usePdf = window.confirm("Press OK to export as PDF.\nPress Cancel to export as Word DOCX.");
        const format = usePdf ? "pdf" : "docx";

        const form = new FormData();
        form.append("title", title);
        form.append("final_note", finalNote);
        form.append("template_name", getSelectedTemplate()?.name || "");

        try {
            exportBtn.disabled = true;
            exportBtnTop.disabled = true;
            exportBtn.textContent = "Exporting...";
            exportBtnTop.textContent = "Exporting...";

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
            console.error("Export error:", error);
            alert("Could not connect to the export service.");
        } finally {
            exportBtn.disabled = false;
            exportBtnTop.disabled = false;
            exportBtn.textContent = "Export";
            exportBtnTop.textContent = "Export";
        }
    }

    function printDocument() {
        const title = noteTitleEl.value.trim() || "Care Note";
        const content = finalNoteEl.value.trim();

        if (!content) {
            alert("There is nothing to print.");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Print window was blocked by the browser.");
            return;
        }

        printWindow.document.write(`
            <html lang="en-GB">
                <head>
                    <title>${escapeHtml(title)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #111827; }
                        h1 { font-size: 24px; margin-bottom: 10px; }
                        .meta { margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>${escapeHtml(title)}</h1>
                    <div class="meta">
                        Template: ${escapeHtml(getSelectedTemplate()?.name || "")}<br>
                        Service: ${escapeHtml(serviceTypeEl.value || "")}<br>
                        Shift / Context: ${escapeHtml(shiftTypeEl.value || "")}<br>
                        Recorded by: ${escapeHtml(recordAuthorEl.value || "")}<br>
                        Record date: ${escapeHtml(meetingDateEl.value || "")}
                    </div>
                    <pre>${escapeHtml(content)}</pre>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function clearAll() {
        const confirmed = window.confirm("Clear the transcript, working draft and current note details?");
        if (!confirmed) return;

        transcriptEl.value = "";
        finalNoteEl.value = "";
        aiDraftEl.value = "";
        aiInstructionEl.value = "";
        noteTitleEl.value = "";
        previousFinalNote = "";
        previousAiDraft = "";
        currentNoteId = null;

        if (audioPlaybackEl) {
            audioPlaybackEl.src = "";
            audioPlaybackEl.style.display = "none";
        }

        recordedBlob = null;
        recordedChunks = [];
        transcribeBtn.disabled = true;
        setNoteMode(false);
        setSaveState("is-idle", "Ready");
        analyseDocument();
        localStorage.removeItem(LOCAL_DRAFT_KEY);
        showToast("Workspace cleared.");
    }

    function handlePromptChipClick(event) {
        const prompt = event.target.getAttribute("data-prompt");
        if (!prompt) return;
        aiInstructionEl.value = prompt;
        aiInstructionEl.focus();
        showToast("AI instruction inserted.");
    }

    function handleTranscriptToolClick(event) {
        const action = event.target.getAttribute("data-transcript-action");
        if (!action) return;

        const map = {
            clean: "Clean this transcript only. Improve punctuation, readability and speaker flow without changing meaning or turning it into a formal note.",
            speakerize: "Format this transcript into clean speaker turns where possible. Do not invent speakers. Use neutral labels such as Speaker 1 and Speaker 2 if needed.",
            summarise: "Summarise this transcript into a concise factual overview suitable for care staff review."
        };

        aiInstructionEl.value = map[action] || "";
        showToast("Transcript action added.");
    }

    function toggleTranscriptVisibility() {
        isTranscriptVisible = !isTranscriptVisible;
        transcriptContentEl.style.display = isTranscriptVisible ? "" : "none";
        toggleTranscriptBtn.textContent = isTranscriptVisible ? "Show / hide" : "Show transcript";
    }

    function renderTemplateBuilderSections() {
        templateSectionsListEl.innerHTML = "";
        templateBuilderSections.forEach((section, index) => {
            const item = document.createElement("div");
            item.className = "template-section-chip";
            item.innerHTML = `
                <span>${escapeHtml(section)}</span>
                <button class="btn btn-light btn-tiny" type="button" data-remove-template-section="${index}">Remove</button>
            `;
            templateSectionsListEl.appendChild(item);
        });
    }

    function renderSavedTemplates() {
        savedTemplatesListEl.innerHTML = "";
        if (!customTemplates.length) {
            savedTemplatesListEl.innerHTML = `<div class="history-empty" style="color:#64748b;">No custom templates saved yet.</div>`;
            return;
        }

        customTemplates.forEach(template => {
            const item = document.createElement("div");
            item.className = "saved-template-item";
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(template.name)}</strong>
                    <div class="history-meta" style="color:#64748b;">${template.sections.length} sections</div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-light btn-tiny" type="button" data-use-template="${template.id}">Use</button>
                    <button class="btn btn-danger btn-tiny" type="button" data-delete-template="${template.id}">Delete</button>
                </div>
            `;
            savedTemplatesListEl.appendChild(item);
        });
    }

    function addTemplateSection() {
        const value = newTemplateSectionInputEl.value.trim();
        if (!value) return;
        templateBuilderSections.push(value);
        newTemplateSectionInputEl.value = "";
        renderTemplateBuilderSections();
    }

    function saveCustomTemplate() {
        const name = templateNameInputEl.value.trim();
        if (!name) {
            alert("Please add a template name.");
            return;
        }

        if (!templateBuilderSections.length) {
            alert("Please add at least one section.");
            return;
        }

        customTemplates.push({
            id: `custom-${Date.now()}`,
            name,
            sections: [...templateBuilderSections]
        });

        saveLocalTemplates(customTemplates);
        populateTemplates();
        renderSavedTemplates();
        templateNameInputEl.value = "";
        templateBuilderSections = [];
        renderTemplateBuilderSections();
        showToast("Custom template saved.");
    }

    function loadLocalTemplates() {
        customTemplates = getLocalTemplates();
    }

    async function loadSavedHistoryFromServer() {
        try {
            const response = await fetch("/ai-notes/history", {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const data = await safeJson(response);
                if (handleUnauthorized(response, data)) return;
                renderHistory();
                return;
            }

            const data = await safeJson(response);
            const items = Array.isArray(data.notes) ? data.notes : [];
            if (items.length) {
                setLocalHistory(items.slice(0, 12).map(item => ({
                    id: item.id || `server-${Date.now()}-${Math.random()}`,
                    title: item.title || "Untitled care note",
                    templateName: item.template_name || "Saved note",
                    updatedAt: item.updated_at || new Date().toISOString(),
                    excerpt: (item.final_note || item.ai_draft || "").slice(0, 180),
                    finalNote: item.final_note || item.ai_draft || "",
                    transcript: item.transcript || ""
                })));
            }

            renderHistory();
        } catch {
            renderHistory();
        }
    }

    function bindEvents() {
        startRecordingBtn?.addEventListener("click", startRecording);
        stopRecordingBtn?.addEventListener("click", stopRecording);
        pauseRecordingBtn?.addEventListener("click", pauseRecording);
        resumeRecordingBtn?.addEventListener("click", resumeRecording);

        closeWorkflowModalBtn?.addEventListener("click", closeWorkflowModal);

        transcribeBtn?.addEventListener("click", transcribeAudio);
        generateBtn?.addEventListener("click", generateWorkingDocument);
        insertTemplateBtn?.addEventListener("click", insertBlankTemplate);

        applyAiEditBtn?.addEventListener("click", applyAiChange);
        undoAiEditBtn?.addEventListener("click", undoLastChange);
        copyDraftBtn?.addEventListener("click", resetFromGeneratedDraft);

        saveBtn?.addEventListener("click", saveDocument);
        saveBtnTop?.addEventListener("click", saveDocument);

        exportBtn?.addEventListener("click", exportDocument);
        exportBtnTop?.addEventListener("click", exportDocument);

        printBtn?.addEventListener("click", printDocument);
        printBtnTop?.addEventListener("click", printDocument);

        clearBtn?.addEventListener("click", clearAll);
        copyFinalBtn?.addEventListener("click", () => copyTextToClipboard(finalNoteEl.value.trim()));
        refreshHistoryBtn?.addEventListener("click", loadSavedHistoryFromServer);

        toggleTranscriptBtn?.addEventListener("click", toggleTranscriptVisibility);

        openTemplateManagerBtn?.addEventListener("click", () => templateModalEl.classList.remove("hidden"));
        closeTemplateManagerBtn?.addEventListener("click", () => templateModalEl.classList.add("hidden"));
        addTemplateSectionBtn?.addEventListener("click", addTemplateSection);
        saveTemplateBtn?.addEventListener("click", saveCustomTemplate);

        document.querySelectorAll(".prompt-chip[data-prompt]").forEach(btn => {
            btn.addEventListener("click", handlePromptChipClick);
        });

        document.querySelectorAll(".prompt-chip[data-transcript-action]").forEach(btn => {
            btn.addEventListener("click", handleTranscriptToolClick);
        });

        [templateSelectEl, serviceTypeEl, shiftTypeEl, recordAuthorEl, youngPersonNameEl, meetingDateEl, transcriptEl, finalNoteEl, noteTitleEl, aiInstructionEl].forEach(el => {
            el?.addEventListener("input", () => {
                updateSelectedTemplateUI();
                analyseDocument();
                setDirtyState();
            });
            el?.addEventListener("change", () => {
                updateSelectedTemplateUI();
                analyseDocument();
                setDirtyState();
            });
        });

        templateSectionsListEl?.addEventListener("click", event => {
            const index = event.target.getAttribute("data-remove-template-section");
            if (index === null) return;
            templateBuilderSections.splice(Number(index), 1);
            renderTemplateBuilderSections();
        });

        savedTemplatesListEl?.addEventListener("click", event => {
            const useId = event.target.getAttribute("data-use-template");
            const deleteId = event.target.getAttribute("data-delete-template");

            if (useId) {
                templateSelectEl.value = useId;
                updateSelectedTemplateUI();
                templateModalEl.classList.add("hidden");
                showToast("Template selected.");
            }

            if (deleteId) {
                customTemplates = customTemplates.filter(t => t.id !== deleteId);
                saveLocalTemplates(customTemplates);
                populateTemplates();
                renderSavedTemplates();
                showToast("Template deleted.");
            }
        });

        historyListEl?.addEventListener("click", async event => {
            const openId = event.target.getAttribute("data-history-open");
            const copyId = event.target.getAttribute("data-history-copy");

            if (openId) openHistoryItem(openId);

            if (copyId) {
                const item = getLocalHistory().find(x => x.id === copyId);
                if (item) await copyTextToClipboard(item.finalNote || "");
            }
        });

        document.addEventListener("keydown", event => {
            const mod = navigator.platform.toUpperCase().includes("MAC") ? event.metaKey : event.ctrlKey;
            if (mod && event.key.toLowerCase() === "s") {
                event.preventDefault();
                saveDocument();
            }
        });
    }

    function init() {
        if (!getAccessToken()) {
            redirectToLogin();
            return;
        }

        meetingDateEl.value = new Date().toISOString().slice(0, 10);
        loadLocalTemplates();
        populateTemplates();
        renderTemplateBuilderSections();
        renderSavedTemplates();
        renderHistory();
        restoreLocalDraft();

        transcribeBtn.disabled = true;
        setStatus("idle", "Ready");
        setSaveState("is-idle", "Ready");
        setNoteMode(false);
        analyseDocument();
        bindEvents();
        loadSavedHistoryFromServer();
    }

    init();
});
