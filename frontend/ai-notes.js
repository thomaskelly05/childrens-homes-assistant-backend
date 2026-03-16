document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";
    const LOCAL_TEMPLATE_KEY = "indicare_custom_templates_v3";
    const LOCAL_DRAFT_KEY = "indicare_ai_notes_draft_v3";
    const LOCAL_HISTORY_KEY = "indicare_ai_notes_history_v3";

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
        },
        {
            id: "professionals-meeting",
            name: "Professionals meeting note",
            sections: [
                "Meeting Title",
                "Date",
                "Attendees",
                "Purpose",
                "Updates Shared",
                "Discussion Summary",
                "Agreed Decisions",
                "Actions",
                "Timescales",
                "Review Arrangements"
            ]
        }
    ];

    const safeguardingKeywords = [
        "safeguarding", "assault", "self-harm", "self harm", "suicide", "sexual",
        "neglect", "abuse", "missing", "police", "injury", "restraint", "physical intervention",
        "knife", "weapon", "overdose", "exploitation", "violence", "threat", "bruise",
        "cut", "disclosure", "allegation", "abscond", "missing from home", "missing from placement"
    ];

    const personCentredKeywords = [
        "wishes", "feelings", "views", "choices", "voice", "presentation",
        "supported", "encouraged", "offered", "agreed", "explained", "consent"
    ];

    const vagueLanguageKeywords = [
        "seemed", "appeared", "probably", "maybe", "possibly", "might have", "I think", "perhaps"
    ];

    const els = {
        startRecordingBtn: document.getElementById("startRecordingBtn"),
        stopRecordingBtn: document.getElementById("stopRecordingBtn"),
        pauseRecordingBtn: document.getElementById("pauseRecordingBtn"),
        resumeRecordingBtn: document.getElementById("resumeRecordingBtn"),
        transcribeBtn: document.getElementById("transcribeBtn"),
        generateBtn: document.getElementById("generateBtn"),
        insertTemplateBtn: document.getElementById("insertTemplateBtn"),

        saveBtn: document.getElementById("saveBtn"),
        exportBtn: document.getElementById("exportBtn"),
        printBtn: document.getElementById("printBtn"),
        clearBtn: document.getElementById("clearBtn"),
        saveBtnTop: document.getElementById("saveBtnTop"),
        exportBtnTop: document.getElementById("exportBtnTop"),
        printBtnTop: document.getElementById("printBtnTop"),

        applyAiEditBtn: document.getElementById("applyAiEditBtn"),
        undoAiEditBtn: document.getElementById("undoAiEditBtn"),
        copyFinalBtn: document.getElementById("copyFinalBtn"),
        copyDraftBtn: document.getElementById("copyDraftBtn"),

        extractActionsBtn: document.getElementById("extractActionsBtn"),
        createHandoverBtn: document.getElementById("createHandoverBtn"),
        createManagerSummaryBtn: document.getElementById("createManagerSummaryBtn"),

        audioPlaybackEl: document.getElementById("audioPlayback"),
        transcriptEl: document.getElementById("transcript"),
        finalNoteEl: document.getElementById("finalNote"),
        noteTitleEl: document.getElementById("noteTitle"),
        aiInstructionEl: document.getElementById("aiInstruction"),
        templateSelectEl: document.getElementById("templateSelect"),
        aiDraftEl: document.getElementById("aiDraft"),
        transcriptMirrorEl: document.getElementById("transcriptMirror"),

        serviceTypeEl: document.getElementById("serviceType"),
        shiftTypeEl: document.getElementById("shiftType"),
        recordAuthorEl: document.getElementById("recordAuthor"),
        youngPersonNameEl: document.getElementById("youngPersonName"),
        meetingDateEl: document.getElementById("meetingDate"),
        locationContextEl: document.getElementById("locationContext"),

        recordingStatusEl: document.getElementById("recordingStatus"),
        recordingTimerEl: document.getElementById("recordingTimer"),
        statusIndicatorDotEl: document.getElementById("statusIndicatorDot"),
        audioReadyTextEl: document.getElementById("audioReadyText"),

        noteModeBadgeEl: document.getElementById("noteModeBadge"),
        saveStateBadgeEl: document.getElementById("saveStateBadge"),
        documentQualityBadgeEl: document.getElementById("documentQualityBadge"),

        safeguardingBoxEl: document.getElementById("safeguardingBox"),
        safeguardingTextEl: document.getElementById("safeguardingText"),

        sidebarTemplateTextEl: document.getElementById("sidebarTemplateText"),
        sidebarSaveTextEl: document.getElementById("sidebarSaveText"),

        historyListEl: document.getElementById("historyList"),
        historyEmptyStateEl: document.getElementById("historyEmptyState"),
        refreshHistoryBtn: document.getElementById("refreshHistoryBtn"),

        toastEl: document.getElementById("toast"),

        toggleTranscriptBtn: document.getElementById("toggleTranscriptBtn"),
        transcriptContentEl: document.getElementById("transcriptContent"),

        templateModalEl: document.getElementById("templateModal"),
        openTemplateManagerBtn: document.getElementById("openTemplateManagerBtn"),
        closeTemplateManagerBtn: document.getElementById("closeTemplateManagerBtn"),
        templateNameInputEl: document.getElementById("templateNameInput"),
        templateSectionsListEl: document.getElementById("templateSectionsList"),
        newTemplateSectionInputEl: document.getElementById("newTemplateSectionInput"),
        addTemplateSectionBtn: document.getElementById("addTemplateSectionBtn"),
        saveTemplateBtn: document.getElementById("saveTemplateBtn"),
        savedTemplatesListEl: document.getElementById("savedTemplatesList"),

        recordingModalEl: document.getElementById("recordingModal"),
        recordingModalMicEl: document.getElementById("recordingModalMic"),
        recordingModalTimerEl: document.getElementById("recordingModalTimer"),
        recordingModalStatusEl: document.getElementById("recordingModalStatus"),

        workflowModalEl: document.getElementById("workflowModal"),
        closeWorkflowModalBtn: document.getElementById("closeWorkflowModalBtn"),
        workflowTemplateTextEl: document.getElementById("workflowTemplateText"),
        workflowStatusTextEl: document.getElementById("workflowStatusText"),
        workflowSaveTextEl: document.getElementById("workflowSaveText"),
        workflowWordCountEl: document.getElementById("workflowWordCount"),

        stepRecordEl: document.getElementById("stepRecord"),
        stepTranscribeEl: document.getElementById("stepTranscribe"),
        stepGenerateEl: document.getElementById("stepGenerate"),
        stepRefineEl: document.getElementById("stepRefine"),

        actionsEmptyStateEl: document.getElementById("actionsEmptyState"),
        actionsListEl: document.getElementById("actionsList")
    };

    const state = {
        mediaRecorder: null,
        recordingStream: null,
        recordedChunks: [],
        recordedBlob: null,
        recordingMimeType: "",
        recordingExtension: "webm",
        previousFinalNote: "",
        previousAiDraft: "",
        currentTimerInterval: null,
        recordingStartTime: null,
        pausedAt: null,
        totalPausedMs: 0,
        customTemplates: [],
        templateBuilderSections: [],
        autosaveTimeout: null,
        currentNoteId: null,
        isTranscriptVisible: true,
        extractedActions: [],
        hasUnsavedChanges: false
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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function showToast(message) {
        if (!els.toastEl) return;
        els.toastEl.textContent = message;
        els.toastEl.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            els.toastEl.classList.remove("show");
        }, 2600);
    }

    function setButtonLoading(button, isLoading, loadingText, defaultText) {
        if (!button) return;
        button.disabled = isLoading;
        button.textContent = isLoading ? loadingText : defaultText;
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
            if (els.recordingModalTimerEl) els.recordingModalTimerEl.textContent = formatted;
        }, 250);
    }

    function stopRecordingTimer() {
        if (state.currentTimerInterval) {
            clearInterval(state.currentTimerInterval);
            state.currentTimerInterval = null;
        }
    }

    function setStatus(mode, label) {
        if (els.recordingStatusEl) {
            els.recordingStatusEl.textContent = label;
            els.recordingStatusEl.className = `status-pill ${mode}`;
        }
        if (els.statusIndicatorDotEl) {
            els.statusIndicatorDotEl.className = `live-dot ${mode}`;
        }
        if (els.workflowStatusTextEl) {
            els.workflowStatusTextEl.textContent = label;
        }
    }

    function setSaveState(stateName, label) {
        if (els.saveStateBadgeEl) {
            els.saveStateBadgeEl.className = `save-state-badge ${stateName}`;
            els.saveStateBadgeEl.textContent = label;
        }
        if (els.workflowSaveTextEl) {
            els.workflowSaveTextEl.textContent = label;
        }
        if (els.sidebarSaveTextEl) {
            els.sidebarSaveTextEl.textContent = label;
        }
    }

    function setNoteMode(isEditing) {
        if (!els.noteModeBadgeEl) return;
        els.noteModeBadgeEl.className = isEditing ? "note-mode-badge is-editing" : "note-mode-badge is-new";
        els.noteModeBadgeEl.textContent = isEditing ? "Editing saved note" : "New unsaved note";
    }

    function openModal(modalEl) {
        modalEl?.classList.remove("hidden");
    }

    function closeModal(modalEl) {
        modalEl?.classList.add("hidden");
    }

    function openRecordingModal() {
        openModal(els.recordingModalEl);
        if (els.recordingModalMicEl) {
            els.recordingModalMicEl.classList.add("recording");
            els.recordingModalMicEl.classList.remove("paused");
        }
        if (els.recordingModalStatusEl) {
            els.recordingModalStatusEl.textContent = "Recording live";
        }
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = false;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
        if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = false;
    }

    function closeRecordingModal() {
        closeModal(els.recordingModalEl);
        if (els.recordingModalMicEl) {
            els.recordingModalMicEl.classList.remove("recording", "paused");
        }
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = true;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
        if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = true;
    }

    function openWorkflowModal() {
        openModal(els.workflowModalEl);
    }

    function closeWorkflowModal(force = false) {
        if (!force && state.hasUnsavedChanges) {
            const confirmed = window.confirm("You have unsaved changes. Close the workspace anyway?");
            if (!confirmed) return;
        }
        closeModal(els.workflowModalEl);
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
        return [...builtInTemplates, ...state.customTemplates];
    }

    function populateTemplates() {
        if (!els.templateSelectEl) return;
        const allTemplates = getAllTemplates();
        els.templateSelectEl.innerHTML = allTemplates
            .map(template => `<option value="${template.id}">${template.name}</option>`)
            .join("");
        updateSelectedTemplateUI();
    }

    function getSelectedTemplate() {
        const selectedId = els.templateSelectEl?.value;
        return getAllTemplates().find(t => t.id === selectedId) || getAllTemplates()[0];
    }

    function updateSelectedTemplateUI() {
        const template = getSelectedTemplate();
        const name = template?.name || "—";
        if (els.workflowTemplateTextEl) els.workflowTemplateTextEl.textContent = name;
        if (els.sidebarTemplateTextEl) els.sidebarTemplateTextEl.textContent = name;
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "")
            .split("\n")
            .map(line => line.trim())
            .find(Boolean);
        return firstLine ? firstLine.replace(/[:#*-]/g, "").slice(0, 120) : "Care record";
    }

    function buildCareContextBlock() {
        return [
            `Service type: ${els.serviceTypeEl?.value || "Not specified"}`,
            `Shift or context: ${els.shiftTypeEl?.value || "Not specified"}`,
            `Recorded by: ${els.recordAuthorEl?.value.trim() || "Not specified"}`,
            `Person supported / young person: ${els.youngPersonNameEl?.value.trim() || "Not specified"}`,
            `Record date: ${els.meetingDateEl?.value || "Not specified"}`,
            `Location / home / service: ${els.locationContextEl?.value.trim() || "Not specified"}`
        ].join("\n");
    }

    function buildTemplateInstruction(template) {
        const lowerTemplateName = String(template?.name || "").toLowerCase();
        let templateModeGuidance = "Rewrite this into a high-quality professional care sector document.";

        if (lowerTemplateName.includes("handover")) {
            templateModeGuidance = "Rewrite this into a concise, shift-ready handover with clear risks, priorities and next actions.";
        } else if (lowerTemplateName.includes("incident")) {
            templateModeGuidance = "Rewrite this into a factual incident record, keeping chronology precise and separating facts from interpretation.";
        } else if (lowerTemplateName.includes("supervision")) {
            templateModeGuidance = "Rewrite this into a professional supervision record with reflective discussion, agreed actions and review points.";
        } else if (lowerTemplateName.includes("safeguarding")) {
            templateModeGuidance = "Rewrite this into a safeguarding-conscious record, clearly separating concern, immediate actions, notifications and next steps.";
        } else if (lowerTemplateName.includes("key-work") || lowerTemplateName.includes("keywork")) {
            templateModeGuidance = "Rewrite this into a person-centred key-work record that reflects the young person's voice, wishes and feelings.";
        }

        return [
            templateModeGuidance,
            "Use clear, factual, respectful, person-centred language.",
            "Do not invent facts.",
            "Keep chronology clear.",
            "Separate observed facts, reported information, actions taken, and next steps where possible.",
            "Retain important names, dates, risks, timescales and decisions.",
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
            "- Preserve important details, names, dates, risks, actions and professional decisions.",
            "- Avoid vague language where a factual wording is possible.",
            "- Distinguish observation from interpretation."
        ].join("\n");
    }

    function updateWorkflowWordCount() {
        const text = els.finalNoteEl?.value || "";
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (els.workflowWordCountEl) {
            els.workflowWordCountEl.textContent = String(wordCount);
        }
    }

    function syncMirrors() {
        if (els.aiDraftEl) els.aiDraftEl.value = els.finalNoteEl?.value || "";
        if (els.transcriptMirrorEl) els.transcriptMirrorEl.value = els.transcriptEl?.value || "";
    }

    function setWorkflowStep(step) {
        const steps = {
            record: els.stepRecordEl,
            transcribe: els.stepTranscribeEl,
            generate: els.stepGenerateEl,
            refine: els.stepRefineEl
        };

        Object.values(steps).forEach(el => {
            if (!el) return;
            el.classList.remove("is-active", "is-complete");
        });

        if (step === "record") {
            steps.record?.classList.add("is-complete");
            steps.transcribe?.classList.add("is-active");
        }

        if (step === "transcribe") {
            steps.record?.classList.add("is-complete");
            steps.transcribe?.classList.add("is-complete");
            steps.generate?.classList.add("is-active");
        }

        if (step === "generate") {
            steps.record?.classList.add("is-complete");
            steps.transcribe?.classList.add("is-complete");
            steps.generate?.classList.add("is-complete");
            steps.refine?.classList.add("is-active");
        }

        if (step === "refine") {
            Object.values(steps).forEach(el => el?.classList.add("is-complete"));
        }
    }

    function analyseDocument() {
        const text = els.finalNoteEl?.value || "";
        const lower = text.toLowerCase();

        const safeguardingMatches = [...new Set(
            safeguardingKeywords.filter(keyword => lower.includes(keyword))
        )];

        if (safeguardingMatches.length) {
            els.safeguardingBoxEl?.classList.remove("hidden");
            if (els.safeguardingTextEl) {
                els.safeguardingTextEl.textContent =
                    `Potential safeguarding or risk-related language found: ${safeguardingMatches.join(", ")}. Review the final note carefully before saving.`;
            }
        } else {
            els.safeguardingBoxEl?.classList.add("hidden");
            if (els.safeguardingTextEl) els.safeguardingTextEl.textContent = "";
        }

        const personCentredCount = personCentredKeywords.filter(keyword => lower.includes(keyword)).length;
        const vagueCount = vagueLanguageKeywords.filter(keyword => lower.includes(keyword.toLowerCase())).length;

        if (els.documentQualityBadgeEl) {
            if (personCentredCount >= 3 && vagueCount === 0) {
                els.documentQualityBadgeEl.textContent = "Strong care draft";
            } else if (vagueCount > 0) {
                els.documentQualityBadgeEl.textContent = "Needs factual review";
            } else {
                els.documentQualityBadgeEl.textContent = "Care draft";
            }
        }

        updateWorkflowWordCount();
        syncMirrors();
    }

    function markDirty() {
        state.hasUnsavedChanges = true;
        setSaveState("is-dirty", "Unsaved changes");
        clearTimeout(state.autosaveTimeout);
        state.autosaveTimeout = setTimeout(() => {
            persistDraftLocally();
        }, 500);
    }

    function markSaved() {
        state.hasUnsavedChanges = false;
        setSaveState("is-saved", "Saved");
    }

    function persistDraftLocally() {
        const payload = {
            transcript: els.transcriptEl?.value || "",
            finalNote: els.finalNoteEl?.value || "",
            aiDraft: els.aiDraftEl?.value || "",
            noteTitle: els.noteTitleEl?.value || "",
            aiInstruction: els.aiInstructionEl?.value || "",
            templateId: els.templateSelectEl?.value || "",
            serviceType: els.serviceTypeEl?.value || "",
            shiftType: els.shiftTypeEl?.value || "",
            recordAuthor: els.recordAuthorEl?.value || "",
            youngPersonName: els.youngPersonNameEl?.value || "",
            meetingDate: els.meetingDateEl?.value || "",
            locationContext: els.locationContextEl?.value || "",
            extractedActions: state.extractedActions || [],
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
    }

    function restoreLocalDraft() {
        try {
            const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);

            if (els.transcriptEl) els.transcriptEl.value = draft.transcript || "";
            if (els.finalNoteEl) els.finalNoteEl.value = draft.finalNote || "";
            if (els.aiDraftEl) els.aiDraftEl.value = draft.aiDraft || draft.finalNote || "";
            if (els.noteTitleEl) els.noteTitleEl.value = draft.noteTitle || "";
            if (els.aiInstructionEl) els.aiInstructionEl.value = draft.aiInstruction || "";
            if (els.recordAuthorEl) els.recordAuthorEl.value = draft.recordAuthor || "";
            if (els.youngPersonNameEl) els.youngPersonNameEl.value = draft.youngPersonName || "";
            if (els.meetingDateEl) els.meetingDateEl.value = draft.meetingDate || "";
            if (els.locationContextEl) els.locationContextEl.value = draft.locationContext || "";
            if (els.serviceTypeEl) els.serviceTypeEl.value = draft.serviceType || els.serviceTypeEl.value;
            if (els.shiftTypeEl) els.shiftTypeEl.value = draft.shiftType || els.shiftTypeEl.value;

            if (draft.templateId && els.templateSelectEl?.querySelector(`option[value="${draft.templateId}"]`)) {
                els.templateSelectEl.value = draft.templateId;
            }

            state.extractedActions = Array.isArray(draft.extractedActions) ? draft.extractedActions : [];
            renderExtractedActions();
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
        if (!els.historyListEl || !els.historyEmptyStateEl) return;

        const items = getLocalHistory();
        els.historyListEl.innerHTML = "";

        if (!items.length) {
            els.historyEmptyStateEl.style.display = "block";
            return;
        }

        els.historyEmptyStateEl.style.display = "none";

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
            els.historyListEl.appendChild(card);
        });
    }

    function openHistoryItem(id) {
        const item = getLocalHistory().find(x => x.id === id);
        if (!item) return;

        state.currentNoteId = item.id;
        if (els.noteTitleEl) els.noteTitleEl.value = item.title || "";
        if (els.transcriptEl) els.transcriptEl.value = item.transcript || "";
        if (els.finalNoteEl) els.finalNoteEl.value = item.finalNote || "";
        if (els.aiDraftEl) els.aiDraftEl.value = item.finalNote || "";

        setNoteMode(true);
        analyseDocument();
        openWorkflowModal();
        setWorkflowStep("refine");
        showToast("Recent note opened.");
    }

    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard.");
        } catch {
            alert("Could not copy to clipboard.");
        }
    }

    function renderTemplateBuilderSections() {
        if (!els.templateSectionsListEl) return;

        els.templateSectionsListEl.innerHTML = "";
        state.templateBuilderSections.forEach((section, index) => {
            const item = document.createElement("div");
            item.className = "template-section-chip";
            item.innerHTML = `
                <span>${escapeHtml(section)}</span>
                <button class="btn btn-light btn-tiny" type="button" data-remove-template-section="${index}">Remove</button>
            `;
            els.templateSectionsListEl.appendChild(item);
        });
    }

    function renderSavedTemplates() {
        if (!els.savedTemplatesListEl) return;

        els.savedTemplatesListEl.innerHTML = "";

        if (!state.customTemplates.length) {
            els.savedTemplatesListEl.innerHTML = `<div class="history-empty" style="color:#64748b;">No custom templates saved yet.</div>`;
            return;
        }

        state.customTemplates.forEach(template => {
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
            els.savedTemplatesListEl.appendChild(item);
        });
    }

    function addTemplateSection() {
        const value = els.newTemplateSectionInputEl?.value.trim();
        if (!value) return;
        state.templateBuilderSections.push(value);
        if (els.newTemplateSectionInputEl) els.newTemplateSectionInputEl.value = "";
        renderTemplateBuilderSections();
    }

    function saveCustomTemplate() {
        const name = els.templateNameInputEl?.value.trim();

        if (!name) {
            alert("Please add a template name.");
            return;
        }

        if (!state.templateBuilderSections.length) {
            alert("Please add at least one section.");
            return;
        }

        state.customTemplates.push({
            id: `custom-${Date.now()}`,
            name,
            sections: [...state.templateBuilderSections]
        });

        saveLocalTemplates(state.customTemplates);
        populateTemplates();
        renderSavedTemplates();

        if (els.templateNameInputEl) els.templateNameInputEl.value = "";
        state.templateBuilderSections = [];
        renderTemplateBuilderSections();
        showToast("Custom template saved.");
    }

    function loadLocalTemplates() {
        state.customTemplates = getLocalTemplates();
    }

    function resetRecordingUi() {
        stopRecordingTimer();
        closeRecordingModal();
        if (els.startRecordingBtn) els.startRecordingBtn.disabled = false;
        if (els.recordingTimerEl) els.recordingTimerEl.textContent = "00:00";
        if (els.recordingModalTimerEl) els.recordingModalTimerEl.textContent = "00:00";
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

            state.mediaRecorder.onstop = () => {
                if (!state.recordedChunks.length) {
                    alert("No recording captured. Please try again.");
                    resetRecordingUi();
                    return;
                }

                state.recordedBlob = new Blob(state.recordedChunks, {
                    type: state.recordingMimeType || "audio/webm"
                });

                if (els.audioPlaybackEl) {
                    els.audioPlaybackEl.src = URL.createObjectURL(state.recordedBlob);
                    els.audioPlaybackEl.style.display = "block";
                }

                if (els.audioReadyTextEl) {
                    els.audioReadyTextEl.textContent = `Recording ready (${formatTime(getElapsedRecordingSeconds())}).`;
                }

                if (state.recordingStream) {
                    state.recordingStream.getTracks().forEach(track => track.stop());
                }

                if (els.transcribeBtn) els.transcribeBtn.disabled = false;

                resetRecordingUi();
                openWorkflowModal();
                setStatus("success", "Recording complete");
                setWorkflowStep("record");
                showToast("Recording complete. AI workspace opened.");
            };

            state.mediaRecorder.onerror = () => {
                alert("Recording failed. Please try again.");
                resetRecordingUi();
            };

            state.mediaRecorder.start(1000);

            if (els.startRecordingBtn) els.startRecordingBtn.disabled = true;
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
        if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
        state.mediaRecorder.pause();
        state.pausedAt = Date.now();

        if (els.recordingModalMicEl) {
            els.recordingModalMicEl.classList.remove("recording");
            els.recordingModalMicEl.classList.add("paused");
        }
        if (els.recordingModalStatusEl) {
            els.recordingModalStatusEl.textContent = "Recording paused";
        }
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

        if (els.recordingModalMicEl) {
            els.recordingModalMicEl.classList.remove("paused");
            els.recordingModalMicEl.classList.add("recording");
        }
        if (els.recordingModalStatusEl) {
            els.recordingModalStatusEl.textContent = "Recording live";
        }
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
        }
    }

    async function transcribeAudio() {
        if (!state.recordedBlob) {
            alert("Please record audio first.");
            return;
        }

        if (state.recordedBlob.size < 1000) {
            alert("The recording appears too short or empty. Please record again.");
            return;
        }

        const filename = `care-note.${state.recordingExtension || "webm"}`;
        const form = new FormData();
        form.append("file", state.recordedBlob, filename);

        try {
            setButtonLoading(els.transcribeBtn, true, "Transcribing...", "Transcribe recording");
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
            if (els.transcriptEl) els.transcriptEl.value = transcript;
            if (els.finalNoteEl) els.finalNoteEl.value = transcript;
            if (els.aiDraftEl) els.aiDraftEl.value = transcript;

            state.previousFinalNote = transcript;
            state.previousAiDraft = transcript;

            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = `Care note - ${new Date().toLocaleDateString("en-GB")}`;
            }

            analyseDocument();
            markDirty();
            setStatus("success", "Transcript ready");
            setWorkflowStep("transcribe");
            showToast("Transcription complete.");
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Could not connect to the transcription service.");
            setStatus("idle", "Ready");
        } finally {
            setButtonLoading(els.transcribeBtn, false, "Transcribing...", "Transcribe recording");
        }
    }

    async function generateWorkingDocument() {
        const transcript = els.transcriptEl?.value.trim();

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
            setButtonLoading(els.generateBtn, true, "Generating...", "Generate care document");
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
            state.previousFinalNote = els.finalNoteEl?.value || transcript;
            state.previousAiDraft = generated;

            if (els.finalNoteEl) els.finalNoteEl.value = generated;
            if (els.aiDraftEl) els.aiDraftEl.value = generated;

            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = deriveTitleFromText(generated);
            }

            analyseDocument();
            markDirty();
            setStatus("success", "Document generated");
            setWorkflowStep("generate");
            showToast("Care document generated.");
        } catch (error) {
            console.error("Generate document error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Ready");
        } finally {
            setButtonLoading(els.generateBtn, false, "Generating...", "Generate care document");
        }
    }

    function insertBlankTemplate() {
        const template = getSelectedTemplate();
        if (!template || !els.finalNoteEl) return;

        els.finalNoteEl.value = template.sections
            .map(section => `${section}\n`)
            .join("\n")
            .trim();

        analyseDocument();
        markDirty();
        setWorkflowStep("refine");
        showToast("Blank template inserted.");
    }

    async function applyAiChange() {
        const instruction = els.aiInstructionEl?.value.trim();
        const currentText = els.finalNoteEl?.value.trim();

        if (!currentText) {
            alert("There is no document to edit yet.");
            return;
        }

        if (!instruction) {
            alert("Please type an instruction for AI.");
            return;
        }

        state.previousFinalNote = els.finalNoteEl.value;

        const form = new FormData();
        form.append("text", currentText);
        form.append("mode", "custom");
        form.append("instruction", buildAiInstruction(instruction));

        try {
            setButtonLoading(els.applyAiEditBtn, true, "Applying...", "Apply AI change");
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

            if (els.finalNoteEl) {
                els.finalNoteEl.value = data.text || currentText;
            }

            analyseDocument();
            markDirty();
            setStatus("success", "AI update applied");
            setWorkflowStep("refine");
            showToast("AI change applied.");
        } catch (error) {
            console.error("Apply AI change error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Ready");
        } finally {
            setButtonLoading(els.applyAiEditBtn, false, "Applying...", "Apply AI change");
        }
    }

    function undoLastChange() {
        if (!state.previousFinalNote) {
            alert("There is no previous version to restore.");
            return;
        }

        if (els.finalNoteEl) els.finalNoteEl.value = state.previousFinalNote;
        analyseDocument();
        markDirty();
        setWorkflowStep("refine");
        showToast("Last change undone.");
    }

    function resetFromGeneratedDraft() {
        if (!els.aiDraftEl?.value.trim()) {
            alert("There is no generated draft to restore.");
            return;
        }

        state.previousFinalNote = els.finalNoteEl?.value || "";
        if (els.finalNoteEl) els.finalNoteEl.value = els.aiDraftEl.value;

        analyseDocument();
        markDirty();
        setWorkflowStep("refine");
        showToast("Draft restored.");
    }

    function renderExtractedActions() {
        if (!els.actionsListEl || !els.actionsEmptyStateEl) return;

        els.actionsListEl.innerHTML = "";

        if (!state.extractedActions.length) {
            els.actionsEmptyStateEl.style.display = "block";
            return;
        }

        els.actionsEmptyStateEl.style.display = "none";

        state.extractedActions.forEach(action => {
            const card = document.createElement("div");
            card.className = "action-item";
            card.innerHTML = `
                <div class="action-item-title">${escapeHtml(action.title || "Action item")}</div>
                <div class="action-item-meta">
                    <span class="action-pill">Owner: ${escapeHtml(action.owner || "Not specified")}</span>
                    <span class="action-pill">Deadline: ${escapeHtml(action.deadline || "Not specified")}</span>
                    <span class="action-pill">Status: ${escapeHtml(action.status || "Open")}</span>
                </div>
            `;
            els.actionsListEl.appendChild(card);
        });
    }

    function extractActionsLocally() {
        const text = els.finalNoteEl?.value || "";
        const lines = text
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        const actionIndicators = [
            "action", "actions", "agreed", "follow-up", "follow up",
            "next step", "next steps", "task", "tasks", "review date", "deadline"
        ];

        const matchedLines = lines.filter(line =>
            actionIndicators.some(indicator => line.toLowerCase().includes(indicator))
        );

        state.extractedActions = matchedLines.slice(0, 8).map((line, index) => ({
            title: line.replace(/^[-•]\s*/, ""),
            owner: index % 2 === 0 ? "Staff team" : "Key worker",
            deadline: "To be confirmed",
            status: "Open"
        }));

        renderExtractedActions();
        showToast(state.extractedActions.length ? "Actions extracted." : "No obvious actions found.");
        persistDraftLocally();
    }

    async function createDerivedDocumentInstruction(instructionText) {
        const currentText = els.finalNoteEl?.value.trim();
        if (!currentText) {
            alert("There is no document to transform yet.");
            return;
        }

        const form = new FormData();
        form.append("text", currentText);
        form.append("mode", "custom");
        form.append("instruction", buildAiInstruction(instructionText));

        try {
            setStatus("processing", "Generating derived version");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "AI transformation failed.");
                return;
            }

            state.previousFinalNote = currentText;
            if (els.finalNoteEl) els.finalNoteEl.value = data.text || currentText;

            analyseDocument();
            markDirty();
            setWorkflowStep("refine");
            setStatus("success", "Derived version ready");
        } catch (error) {
            console.error("Derived document error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Ready");
        }
    }

    async function createHandoverVersion() {
        await createDerivedDocumentInstruction(
            "Turn this into a concise handover-ready summary with immediate risks, health, appointments, medication, professional contact and priorities for the next shift."
        );
        showToast("Handover version created.");
    }

    async function createManagerSummary() {
        await createDerivedDocumentInstruction(
            "Rewrite this into a concise manager update. Focus on key issues, risks, actions taken, decisions required and next steps."
        );
        showToast("Manager summary created.");
    }

    async function saveDocument() {
        const transcript = els.transcriptEl?.value.trim();
        const finalNote = els.finalNoteEl?.value.trim();
        const title = els.noteTitleEl?.value.trim() || deriveTitleFromText(finalNote);

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
        form.append("ai_draft", els.aiDraftEl?.value.trim() || finalNote);
        form.append("final_note", finalNote);
        form.append("title", title);
        form.append("template_name", getSelectedTemplate()?.name || "");
        form.append("service_type", els.serviceTypeEl?.value || "");
        form.append("shift_type", els.shiftTypeEl?.value || "");
        form.append("record_author", els.recordAuthorEl?.value || "");
        form.append("young_person_name", els.youngPersonNameEl?.value || "");
        form.append("record_date", els.meetingDateEl?.value || "");
        form.append("location_context", els.locationContextEl?.value || "");

        try {
            if (els.saveBtn) els.saveBtn.disabled = true;
            if (els.saveBtnTop) els.saveBtnTop.disabled = true;
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

            state.currentNoteId = data.id || state.currentNoteId || `note-${Date.now()}`;
            setNoteMode(true);
            markSaved();

            addToLocalHistory({
                id: state.currentNoteId,
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
            if (els.saveBtn) els.saveBtn.disabled = false;
            if (els.saveBtnTop) els.saveBtnTop.disabled = false;
        }
    }

    async function exportDocument() {
        const finalNote = els.finalNoteEl?.value.trim();
        const title = els.noteTitleEl?.value.trim() || "Care Note";

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
            if (els.exportBtn) {
                els.exportBtn.disabled = true;
                els.exportBtn.textContent = "Exporting...";
            }
            if (els.exportBtnTop) {
                els.exportBtnTop.disabled = true;
                els.exportBtnTop.textContent = "Exporting...";
            }

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
            if (els.exportBtn) {
                els.exportBtn.disabled = false;
                els.exportBtn.textContent = "Export";
            }
            if (els.exportBtnTop) {
                els.exportBtnTop.disabled = false;
                els.exportBtnTop.textContent = "Export";
            }
        }
    }

    function printDocument() {
        const title = els.noteTitleEl?.value.trim() || "Care Note";
        const content = els.finalNoteEl?.value.trim();

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
                        Service: ${escapeHtml(els.serviceTypeEl?.value || "")}<br>
                        Shift / Context: ${escapeHtml(els.shiftTypeEl?.value || "")}<br>
                        Recorded by: ${escapeHtml(els.recordAuthorEl?.value || "")}<br>
                        Record date: ${escapeHtml(els.meetingDateEl?.value || "")}<br>
                        Location: ${escapeHtml(els.locationContextEl?.value || "")}
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

        if (els.transcriptEl) els.transcriptEl.value = "";
        if (els.finalNoteEl) els.finalNoteEl.value = "";
        if (els.aiDraftEl) els.aiDraftEl.value = "";
        if (els.aiInstructionEl) els.aiInstructionEl.value = "";
        if (els.noteTitleEl) els.noteTitleEl.value = "";

        state.previousFinalNote = "";
        state.previousAiDraft = "";
        state.currentNoteId = null;
        state.extractedActions = [];

        if (els.audioPlaybackEl) {
            els.audioPlaybackEl.src = "";
            els.audioPlaybackEl.style.display = "none";
        }

        state.recordedBlob = null;
        state.recordedChunks = [];
        if (els.transcribeBtn) els.transcribeBtn.disabled = true;

        setNoteMode(false);
        setSaveState("is-idle", "Ready");
        analyseDocument();
        renderExtractedActions();
        localStorage.removeItem(LOCAL_DRAFT_KEY);
        state.hasUnsavedChanges = false;
        setWorkflowStep("record");
        showToast("Workspace cleared.");
    }

    function toggleTranscriptVisibility() {
        state.isTranscriptVisible = !state.isTranscriptVisible;
        if (els.transcriptContentEl) {
            els.transcriptContentEl.style.display = state.isTranscriptVisible ? "" : "none";
        }
        if (els.toggleTranscriptBtn) {
            els.toggleTranscriptBtn.textContent = state.isTranscriptVisible ? "Show / hide" : "Show transcript";
        }
    }

    function handlePromptChipClick(event) {
        const prompt = event.target.getAttribute("data-prompt");
        if (!prompt || !els.aiInstructionEl) return;
        els.aiInstructionEl.value = prompt;
        els.aiInstructionEl.focus();
        markDirty();
        showToast("AI instruction inserted.");
    }

    function handleTranscriptToolClick(event) {
        const action = event.target.getAttribute("data-transcript-action");
        if (!action || !els.aiInstructionEl) return;

        const map = {
            clean: "Clean this transcript only. Improve punctuation, readability and speaker flow without changing meaning or turning it into a formal note.",
            speakerize: "Format this transcript into clean speaker turns where possible. Do not invent speakers. Use neutral labels such as Speaker 1 and Speaker 2 if needed.",
            summarise: "Summarise this transcript into a concise factual overview suitable for care staff review."
        };

        els.aiInstructionEl.value = map[action] || "";
        markDirty();
        showToast("Transcript action added.");
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
                setLocalHistory(
                    items.slice(0, 12).map(item => ({
                        id: item.id || `server-${Date.now()}-${Math.random()}`,
                        title: item.title || "Untitled care note",
                        templateName: item.template_name || "Saved note",
                        updatedAt: item.updated_at || new Date().toISOString(),
                        excerpt: (item.final_note || item.ai_draft || "").slice(0, 180),
                        finalNote: item.final_note || item.ai_draft || "",
                        transcript: item.transcript || ""
                    }))
                );
            }

            renderHistory();
        } catch {
            renderHistory();
        }
    }

    function bindTextInputs() {
        const trackedInputs = [
            els.templateSelectEl,
            els.serviceTypeEl,
            els.shiftTypeEl,
            els.recordAuthorEl,
            els.youngPersonNameEl,
            els.meetingDateEl,
            els.locationContextEl,
            els.transcriptEl,
            els.finalNoteEl,
            els.noteTitleEl,
            els.aiInstructionEl
        ];

        trackedInputs.forEach(el => {
            el?.addEventListener("input", () => {
                updateSelectedTemplateUI();
                analyseDocument();
                markDirty();
            });
            el?.addEventListener("change", () => {
                updateSelectedTemplateUI();
                analyseDocument();
                markDirty();
            });
        });
    }

    function bindTemplateEvents() {
        els.openTemplateManagerBtn?.addEventListener("click", () => openModal(els.templateModalEl));
        els.closeTemplateManagerBtn?.addEventListener("click", () => closeModal(els.templateModalEl));
        els.addTemplateSectionBtn?.addEventListener("click", addTemplateSection);
        els.saveTemplateBtn?.addEventListener("click", saveCustomTemplate);

        els.templateSectionsListEl?.addEventListener("click", event => {
            const index = event.target.getAttribute("data-remove-template-section");
            if (index === null) return;
            state.templateBuilderSections.splice(Number(index), 1);
            renderTemplateBuilderSections();
        });

        els.savedTemplatesListEl?.addEventListener("click", event => {
            const useId = event.target.getAttribute("data-use-template");
            const deleteId = event.target.getAttribute("data-delete-template");

            if (useId && els.templateSelectEl) {
                els.templateSelectEl.value = useId;
                updateSelectedTemplateUI();
                closeModal(els.templateModalEl);
                markDirty();
                showToast("Template selected.");
            }

            if (deleteId) {
                state.customTemplates = state.customTemplates.filter(t => t.id !== deleteId);
                saveLocalTemplates(state.customTemplates);
                populateTemplates();
                renderSavedTemplates();
                showToast("Template deleted.");
            }
        });
    }

    function bindHistoryEvents() {
        els.historyListEl?.addEventListener("click", async event => {
            const openId = event.target.getAttribute("data-history-open");
            const copyId = event.target.getAttribute("data-history-copy");

            if (openId) {
                openHistoryItem(openId);
            }

            if (copyId) {
                const item = getLocalHistory().find(x => x.id === copyId);
                if (item) await copyTextToClipboard(item.finalNote || "");
            }
        });
    }

    function bindPromptEvents() {
        document.querySelectorAll(".prompt-chip[data-prompt]").forEach(btn => {
            btn.addEventListener("click", handlePromptChipClick);
        });

        document.querySelectorAll(".prompt-chip[data-transcript-action]").forEach(btn => {
            btn.addEventListener("click", handleTranscriptToolClick);
        });
    }

    function bindEvents() {
        els.startRecordingBtn?.addEventListener("click", startRecording);
        els.stopRecordingBtn?.addEventListener("click", stopRecording);
        els.pauseRecordingBtn?.addEventListener("click", pauseRecording);
        els.resumeRecordingBtn?.addEventListener("click", resumeRecording);

        els.closeWorkflowModalBtn?.addEventListener("click", () => closeWorkflowModal(false));
        els.transcribeBtn?.addEventListener("click", transcribeAudio);
        els.generateBtn?.addEventListener("click", generateWorkingDocument);
        els.insertTemplateBtn?.addEventListener("click", insertBlankTemplate);

        els.applyAiEditBtn?.addEventListener("click", applyAiChange);
        els.undoAiEditBtn?.addEventListener("click", undoLastChange);
        els.copyDraftBtn?.addEventListener("click", resetFromGeneratedDraft);
        els.copyFinalBtn?.addEventListener("click", () => copyTextToClipboard(els.finalNoteEl?.value.trim() || ""));

        els.extractActionsBtn?.addEventListener("click", extractActionsLocally);
        els.createHandoverBtn?.addEventListener("click", createHandoverVersion);
        els.createManagerSummaryBtn?.addEventListener("click", createManagerSummary);

        els.saveBtn?.addEventListener("click", saveDocument);
        els.saveBtnTop?.addEventListener("click", saveDocument);

        els.exportBtn?.addEventListener("click", exportDocument);
        els.exportBtnTop?.addEventListener("click", exportDocument);

        els.printBtn?.addEventListener("click", printDocument);
        els.printBtnTop?.addEventListener("click", printDocument);

        els.clearBtn?.addEventListener("click", clearAll);
        els.refreshHistoryBtn?.addEventListener("click", loadSavedHistoryFromServer);
        els.toggleTranscriptBtn?.addEventListener("click", toggleTranscriptVisibility);

        bindTextInputs();
        bindTemplateEvents();
        bindHistoryEvents();
        bindPromptEvents();

        document.addEventListener("keydown", event => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");
            const mod = isMac ? event.metaKey : event.ctrlKey;

            if (mod && event.key.toLowerCase() === "s") {
                event.preventDefault();
                saveDocument();
            }

            if (mod && event.key.toLowerCase() === "p") {
                event.preventDefault();
                printDocument();
            }

            if (event.key === "Escape") {
                if (!els.recordingModalEl?.classList.contains("hidden")) {
                    return;
                }
                if (!els.workflowModalEl?.classList.contains("hidden")) {
                    closeWorkflowModal(false);
                }
            }
        });
    }

    function init() {
        if (!getAccessToken()) {
            redirectToLogin();
            return;
        }

        if (els.meetingDateEl && !els.meetingDateEl.value) {
            els.meetingDateEl.value = new Date().toISOString().slice(0, 10);
        }

        loadLocalTemplates();
        populateTemplates();
        renderTemplateBuilderSections();
        renderSavedTemplates();
        renderHistory();
        renderExtractedActions();
        restoreLocalDraft();

        if (els.transcribeBtn) els.transcribeBtn.disabled = true;
        setStatus("idle", "Ready");
        setSaveState("is-idle", "Ready");
        setNoteMode(false);
        setWorkflowStep("record");
        analyseDocument();

        bindEvents();
        loadSavedHistoryFromServer();
    }

    init();
});
