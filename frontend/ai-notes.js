```javascript
document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";
    const LOCAL_TEMPLATE_KEY = "indicare_custom_templates_v9";
    const LOCAL_DRAFT_KEY = "indicare_inotes_draft_v9";
    const LOCAL_HISTORY_KEY = "indicare_inotes_history_v9";

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
        "supported", "encouraged", "offered", "agreed", "explained", "consent",
        "preferred", "wanted", "asked for", "decided", "chose"
    ];

    const vagueLanguageKeywords = [
        "seemed", "appeared", "probably", "maybe", "possibly", "might have", "perhaps",
        "i think", "i feel", "sort of", "kind of"
    ];

    const els = {
        authGateEl: document.getElementById("authGate"),
        appRootEl: document.getElementById("appRoot"),
        authGateMessageEl: document.getElementById("authGateMessage"),
        authGateLoginFormEl: document.getElementById("authGateLoginForm"),
        authEmailEl: document.getElementById("authEmail"),
        authPasswordEl: document.getElementById("authPassword"),
        authLoginBtn: document.getElementById("authLoginBtn"),
        startSubscriptionBtn: document.getElementById("startSubscriptionBtn"),
        logoutBtn: document.getElementById("logoutBtn"),

        startRecordingBtn: document.getElementById("startRecordingBtn"),
        refreshHistoryBtn: document.getElementById("refreshHistoryBtn"),

        openCreateTabBtn: document.getElementById("openCreateTabBtn"),
        openSavedTabBtn: document.getElementById("openSavedTabBtn"),
        createTabPanel: document.getElementById("createTabPanel"),
        savedTabPanel: document.getElementById("savedTabPanel"),
        savedNotesSearch: document.getElementById("savedNotesSearch"),
        savedNotesFilter: document.getElementById("savedNotesFilter"),
        historyEmptyStateEl: document.getElementById("historyEmptyState"),
        historyListEl: document.getElementById("historyList"),

        templateSelectEl: document.getElementById("templateSelect"),
        openTemplateManagerBtn: document.getElementById("openTemplateManagerBtn"),
        closeTemplateManagerBtn: document.getElementById("closeTemplateManagerBtn"),
        templateModalEl: document.getElementById("templateModal"),
        templateNameInputEl: document.getElementById("templateNameInput"),
        templateSectionsListEl: document.getElementById("templateSectionsList"),
        newTemplateSectionInputEl: document.getElementById("newTemplateSectionInput"),
        addTemplateSectionBtn: document.getElementById("addTemplateSectionBtn"),
        saveTemplateBtn: document.getElementById("saveTemplateBtn"),
        savedTemplatesListEl: document.getElementById("savedTemplatesList"),

        serviceTypeEl: document.getElementById("serviceType"),
        shiftTypeEl: document.getElementById("shiftType"),
        meetingFormatEl: document.getElementById("meetingFormat"),
        recordAuthorEl: document.getElementById("recordAuthor"),
        youngPersonNameEl: document.getElementById("youngPersonName"),
        meetingDateEl: document.getElementById("meetingDate"),
        locationContextEl: document.getElementById("locationContext"),

        recordingModalEl: document.getElementById("recordingModal"),
        recordingModalMicEl: document.getElementById("recordingModalMic"),
        recordingModalTimerEl: document.getElementById("recordingModalTimer"),
        recordingModalStatusEl: document.getElementById("recordingModalStatus"),
        pauseRecordingBtn: document.getElementById("pauseRecordingBtn"),
        resumeRecordingBtn: document.getElementById("resumeRecordingBtn"),
        stopRecordingBtn: document.getElementById("stopRecordingBtn"),

        workflowModalEl: document.getElementById("workflowModal"),
        closeWorkflowModalBtn: document.getElementById("closeWorkflowModalBtn"),
        meetingModeOnlineBtn: document.getElementById("meetingModeOnlineBtn"),
        meetingModeInPersonBtn: document.getElementById("meetingModeInPersonBtn"),
        workflowMeetingFormatEl: document.getElementById("workflowMeetingFormat"),
        workflowTemplateTextEl: document.getElementById("workflowTemplateText"),
        workflowMeetingFormatTextEl: document.getElementById("workflowMeetingFormatText"),
        workflowStatusTextEl: document.getElementById("workflowStatusText"),
        workflowSaveTextEl: document.getElementById("workflowSaveText"),
        workflowWordCountEl: document.getElementById("workflowWordCount"),

        transcribeBtn: document.getElementById("transcribeBtn"),
        generateBtn: document.getElementById("generateBtn"),
        reapplyTemplateBtn: document.getElementById("reapplyTemplateBtn"),

        audioReadyTextEl: document.getElementById("audioReadyText"),
        audioPlaybackEl: document.getElementById("audioPlayback"),
        toggleTranscriptBtn: document.getElementById("toggleTranscriptBtn"),
        transcriptContentEl: document.getElementById("transcriptContent"),
        transcriptEl: document.getElementById("transcript"),

        noteModeBadgeEl: document.getElementById("noteModeBadge"),
        saveStateBadgeEl: document.getElementById("saveStateBadge"),
        documentQualityBadgeEl: document.getElementById("documentQualityBadge"),
        noteTitleEl: document.getElementById("noteTitle"),
        aiInstructionEl: document.getElementById("aiInstruction"),
        finalNoteEl: document.getElementById("finalNote"),

        copyFinalBtn: document.getElementById("copyFinalBtn"),
        saveBtnTop: document.getElementById("saveBtnTop"),
        exportBtnTop: document.getElementById("exportBtnTop"),
        printBtnTop: document.getElementById("printBtnTop"),

        applyAiEditBtn: document.getElementById("applyAiEditBtn"),
        undoAiEditBtn: document.getElementById("undoAiEditBtn"),
        copyDraftBtn: document.getElementById("copyDraftBtn"),

        createHandoverBtn: document.getElementById("createHandoverBtn"),
        createManagerSummaryBtn: document.getElementById("createManagerSummaryBtn"),
        insertTemplateBtn: document.getElementById("insertTemplateBtn"),
        extractActionsBtn: document.getElementById("extractActionsBtn"),

        saveBtn: document.getElementById("saveBtn"),
        exportBtn: document.getElementById("exportBtn"),
        printBtn: document.getElementById("printBtn"),
        clearBtn: document.getElementById("clearBtn"),

        actionsEmptyStateEl: document.getElementById("actionsEmptyState"),
        actionsListEl: document.getElementById("actionsList"),

        safeguardingBoxEl: document.getElementById("safeguardingBox"),
        safeguardingTextEl: document.getElementById("safeguardingText"),

        aiDraftEl: document.getElementById("aiDraft"),
        transcriptMirrorEl: document.getElementById("transcriptMirror"),

        toastEl: document.getElementById("toast")
    };

    const state = {
        customTemplates: [],
        templateBuilderSections: [],
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
        previousFinalNote: "",
        previousAiDraft: "",
        extractedActions: [],
        hasUnsavedChanges: false,
        isTranscriptVisible: true,
        activeTab: "create",
        meetingFormat: "Not specified",
        autosaveTimeout: null
    };

    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    }

    async function safeJson(response) {
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return { detail: text || "Invalid server response" };
        }
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAccessToken();
        return token ? { ...extraHeaders, Authorization: `Bearer ${token}` } : { ...extraHeaders };
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
        }, 2200);
    }

    function showAuthGate(message = "Please sign in to continue.", mode = "") {
        if (els.authGateEl) els.authGateEl.style.display = "flex";
        if (els.appRootEl) els.appRootEl.classList.add("app-hidden");
        if (els.authGateMessageEl) {
            els.authGateMessageEl.textContent = message;
            els.authGateMessageEl.className = `auth-gate-message${mode ? ` ${mode}` : ""}`;
        }
    }

    function hideAuthGate() {
        if (els.authGateEl) els.authGateEl.style.display = "none";
        if (els.appRootEl) els.appRootEl.classList.remove("app-hidden");
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
            if (els.recordingModalTimerEl) els.recordingModalTimerEl.textContent = formatted;
        }, 250);
    }

    function stopRecordingTimer() {
        if (state.currentTimerInterval) {
            clearInterval(state.currentTimerInterval);
            state.currentTimerInterval = null;
        }
    }

    function setActiveTab(tabName) {
        state.activeTab = tabName;
        els.openCreateTabBtn?.classList.toggle("is-active", tabName === "create");
        els.openSavedTabBtn?.classList.toggle("is-active", tabName === "saved");
        els.createTabPanel?.classList.toggle("is-active", tabName === "create");
        els.savedTabPanel?.classList.toggle("is-active", tabName === "saved");
    }

    function openModal(el) {
        el?.classList.remove("hidden");
    }

    function closeModal(el) {
        el?.classList.add("hidden");
    }

    function updateWorkflowStatus(text) {
        if (els.workflowStatusTextEl) els.workflowStatusTextEl.textContent = text;
    }

    function setSaveState(label) {
        if (els.saveStateBadgeEl) els.saveStateBadgeEl.textContent = label;
        if (els.workflowSaveTextEl) els.workflowSaveTextEl.textContent = label;
    }

    function setNoteMode(isEditing) {
        if (!els.noteModeBadgeEl) return;
        els.noteModeBadgeEl.textContent = isEditing ? "Editing saved note" : "New unsaved note";
    }

    function updateWorkflowWordCount() {
        const text = els.finalNoteEl?.value || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        if (els.workflowWordCountEl) els.workflowWordCountEl.textContent = String(words);
    }

    function getSelectedTemplate() {
        const all = [...builtInTemplates, ...state.customTemplates];
        return all.find(t => t.id === els.templateSelectEl?.value) || all[0];
    }

    function updateTemplateUi() {
        const template = getSelectedTemplate();
        if (els.workflowTemplateTextEl) {
            els.workflowTemplateTextEl.textContent = template?.name || "—";
        }
    }

    function setMeetingFormat(value) {
        const next = value || "Not specified";
        state.meetingFormat = next;

        if (els.meetingFormatEl && els.meetingFormatEl.value !== next) {
            els.meetingFormatEl.value = next;
        }
        if (els.workflowMeetingFormatEl && els.workflowMeetingFormatEl.value !== next) {
            els.workflowMeetingFormatEl.value = next;
        }
        if (els.workflowMeetingFormatTextEl) {
            els.workflowMeetingFormatTextEl.textContent = next;
        }

        els.meetingModeOnlineBtn?.classList.toggle("is-selected", next === "Online meeting");
        els.meetingModeInPersonBtn?.classList.toggle("is-selected", next === "Meeting in person");
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "")
            .split("\n")
            .map(line => line.trim())
            .find(Boolean);

        return firstLine ? firstLine.replace(/[:#*-]/g, "").slice(0, 120) : "Care record";
    }

    function smartDefaultTitle() {
        const parts = [
            els.shiftTypeEl?.value || "Care record",
            els.youngPersonNameEl?.value?.trim() || "",
            els.meetingDateEl?.value || new Date().toISOString().slice(0, 10)
        ].filter(Boolean);
        return parts.join(" - ");
    }

    function buildCareContextBlock() {
        return [
            `Service type: ${els.serviceTypeEl?.value || "Not specified"}`,
            `Shift or context: ${els.shiftTypeEl?.value || "Not specified"}`,
            `Meeting format: ${state.meetingFormat || "Not specified"}`,
            `Recorded by: ${els.recordAuthorEl?.value.trim() || "Not specified"}`,
            `Person supported / young person: ${els.youngPersonNameEl?.value.trim() || "Not specified"}`,
            `Record date: ${els.meetingDateEl?.value || "Not specified"}`,
            `Location / home / service: ${els.locationContextEl?.value.trim() || "Not specified"}`
        ].join("\n");
    }

    function buildTemplateInstruction(template) {
        return [
            "Rewrite this into a high-quality professional care sector document.",
            "Use clear, factual, respectful, person-centred language.",
            "Do not invent facts.",
            "Keep chronology clear.",
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
            "- Preserve important details, names, dates, risks, actions and professional decisions."
        ].join("\n");
    }

    function setDefaultAiInstruction(force = false) {
        if (!els.aiInstructionEl) return;
        if (!force && els.aiInstructionEl.value.trim()) return;

        const template = getSelectedTemplate();
        const name = (template?.name || "").toLowerCase();

        if (name.includes("handover")) {
            els.aiInstructionEl.value = "Create a concise, professional shift handover with clear risks, actions and priorities.";
        } else if (name.includes("incident")) {
            els.aiInstructionEl.value = "Create a factual incident record with clear chronology, staff response, outcome and follow-up.";
        } else if (name.includes("safeguarding")) {
            els.aiInstructionEl.value = "Create a safeguarding-conscious record separating facts, observations, actions taken and next steps.";
        } else if (name.includes("supervision")) {
            els.aiInstructionEl.value = "Create a professional supervision summary with reflection, strengths, development areas and agreed actions.";
        } else if (name.includes("key")) {
            els.aiInstructionEl.value = "Create a person-centred key-work session note reflecting the young person's voice, wishes and feelings.";
        } else {
            els.aiInstructionEl.value = "Create a professional, factual, person-centred care note using the selected template.";
        }
    }

    function populateTemplates() {
        if (!els.templateSelectEl) return;
        const current = els.templateSelectEl.value;
        const all = [...builtInTemplates, ...state.customTemplates];

        els.templateSelectEl.innerHTML = all
            .map(template => `<option value="${template.id}">${template.name}</option>`)
            .join("");

        if (current && els.templateSelectEl.querySelector(`option[value="${current}"]`)) {
            els.templateSelectEl.value = current;
        }

        updateTemplateUi();
        setDefaultAiInstruction();
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
            els.savedTemplatesListEl.innerHTML = `<div class="empty-state-inline">No custom templates saved yet.</div>`;
            return;
        }

        state.customTemplates.forEach(template => {
            const item = document.createElement("div");
            item.className = "saved-template-item";
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(template.name)}</strong>
                    <div class="saved-note-subtitle">${template.sections.length} sections</div>
                </div>
                <div class="saved-note-actions">
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
        renderSavedTemplates();
        populateTemplates();

        if (els.templateNameInputEl) els.templateNameInputEl.value = "";
        state.templateBuilderSections = [];
        renderTemplateBuilderSections();
        showToast("Custom template saved.");
    }

    function getLocalDraft() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY) || "null");
        } catch {
            return null;
        }
    }

    function persistDraftLocally() {
        const payload = {
            currentNoteId: state.currentNoteId,
            transcript: els.transcriptEl?.value || "",
            finalNote: els.finalNoteEl?.value || "",
            aiDraft: els.aiDraftEl?.value || "",
            noteTitle: els.noteTitleEl?.value || "",
            aiInstruction: els.aiInstructionEl?.value || "",
            templateId: els.templateSelectEl?.value || "",
            serviceType: els.serviceTypeEl?.value || "",
            shiftType: els.shiftTypeEl?.value || "",
            meetingFormat: state.meetingFormat || "Not specified",
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
        const draft = getLocalDraft();
        if (!draft) return;

        state.currentNoteId = draft.currentNoteId || null;
        if (els.transcriptEl) els.transcriptEl.value = draft.transcript || "";
        if (els.finalNoteEl) els.finalNoteEl.value = draft.finalNote || "";
        if (els.aiDraftEl) els.aiDraftEl.value = draft.aiDraft || draft.finalNote || "";
        if (els.noteTitleEl) els.noteTitleEl.value = draft.noteTitle || "";
        if (els.aiInstructionEl) els.aiInstructionEl.value = draft.aiInstruction || "";
        if (els.serviceTypeEl && draft.serviceType) els.serviceTypeEl.value = draft.serviceType;
        if (els.shiftTypeEl && draft.shiftType) els.shiftTypeEl.value = draft.shiftType;
        if (els.recordAuthorEl) els.recordAuthorEl.value = draft.recordAuthor || "";
        if (els.youngPersonNameEl) els.youngPersonNameEl.value = draft.youngPersonName || "";
        if (els.meetingDateEl) els.meetingDateEl.value = draft.meetingDate || "";
        if (els.locationContextEl) els.locationContextEl.value = draft.locationContext || "";
        if (draft.templateId && els.templateSelectEl?.querySelector(`option[value="${draft.templateId}"]`)) {
            els.templateSelectEl.value = draft.templateId;
        }
        setMeetingFormat(draft.meetingFormat || "Not specified");
        state.extractedActions = Array.isArray(draft.extractedActions) ? draft.extractedActions : [];
        renderExtractedActions();
        updateTemplateUi();
        analyseDocument();
        setNoteMode(Boolean(state.currentNoteId));
    }

    function markDirty() {
        state.hasUnsavedChanges = true;
        setSaveState("Unsaved changes");
        clearTimeout(state.autosaveTimeout);
        state.autosaveTimeout = setTimeout(() => {
            persistDraftLocally();
        }, 800);
    }

    function markSaved() {
        state.hasUnsavedChanges = false;
        setSaveState("Saved");
        persistDraftLocally();
    }

    function analyseDocument() {
        const text = (els.finalNoteEl?.value || "").trim();
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
        const vagueCount = vagueLanguageKeywords.filter(keyword => lower.includes(keyword)).length;

        if (els.documentQualityBadgeEl) {
            if (personCentredCount >= 4 && vagueCount === 0) {
                els.documentQualityBadgeEl.textContent = "Strong care draft";
            } else if (vagueCount > 0) {
                els.documentQualityBadgeEl.textContent = "Needs factual review";
            } else {
                els.documentQualityBadgeEl.textContent = "Care draft";
            }
        }

        updateWorkflowWordCount();
        if (els.aiDraftEl) els.aiDraftEl.value = els.finalNoteEl?.value || "";
        if (els.transcriptMirrorEl) els.transcriptMirrorEl.value = els.transcriptEl?.value || "";
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

    function normaliseHistoryItem(item) {
        return {
            id: item.id,
            title: item.title || "Untitled care note",
            templateName: item.templateName || item.template_name || "Saved note",
            updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
            excerpt: item.excerpt || (item.finalNote || item.final_note || item.ai_draft || "").slice(0, 180),
            finalNote: item.finalNote || item.final_note || item.ai_draft || "",
            transcript: item.transcript || "",
            personName: item.personName || item.young_person_name || "",
            status: item.status || "Saved",
            isLocalOnly: Boolean(item.isLocalOnly),
            serviceType: item.serviceType || item.service_type || "",
            shiftType: item.shiftType || item.shift_type || "",
            meetingFormat: item.meetingFormat || item.meeting_format || "Not specified"
        };
    }

    function inferFilterValue(item) {
        const name = String(item.templateName || "").toLowerCase();
        if (name.includes("daily")) return "daily";
        if (name.includes("handover")) return "handover";
        if (name.includes("incident")) return "incident";
        if (name.includes("supervision")) return "supervision";
        if (name.includes("key")) return "keywork";
        if (name.includes("safeguarding")) return "safeguarding";
        if (name.includes("professional")) return "meeting";
        return "all";
    }

    function upsertHistoryItem(item) {
        const nextItem = normaliseHistoryItem(item);
        const next = [nextItem, ...getLocalHistory().filter(x => x.id !== nextItem.id)].slice(0, 50);
        setLocalHistory(next);
        applyHistoryFiltersAndRender();
    }

    function applyHistoryFiltersAndRender() {
        const allItems = getLocalHistory().map(normaliseHistoryItem);
        const search = String(els.savedNotesSearch?.value || "").trim().toLowerCase();
        const filter = String(els.savedNotesFilter?.value || "all");

        const filtered = allItems.filter(item => {
            const haystack = [
                item.title,
                item.templateName,
                item.personName,
                item.updatedAt,
                item.shiftType,
                item.serviceType,
                item.meetingFormat
            ].join(" ").toLowerCase();

            const matchesSearch = !search || haystack.includes(search);
            const matchesFilter = filter === "all" || inferFilterValue(item) === filter;
            return matchesSearch && matchesFilter;
        });

        renderHistoryTable(filtered);
    }

    function renderHistoryTable(items) {
        if (!els.historyListEl || !els.historyEmptyStateEl) return;
        els.historyListEl.innerHTML = "";

        if (!items.length) {
            els.historyEmptyStateEl.style.display = "block";
            return;
        }

        els.historyEmptyStateEl.style.display = "none";

        items.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <div class="saved-note-title">${escapeHtml(item.title)}</div>
                    <div class="saved-note-subtitle">${escapeHtml(item.excerpt || "No preview available.")}</div>
                </td>
                <td>${escapeHtml(item.templateName || "—")}</td>
                <td>${escapeHtml(item.personName || "—")}</td>
                <td>${new Date(item.updatedAt).toLocaleString("en-GB")}</td>
                <td>
                    <span class="saved-note-status ${String(item.status).toLowerCase() === "saved" ? "saved" : "draft"}">
                        ${escapeHtml(item.status || "Saved")}
                    </span>
                </td>
                <td>
                    <div class="saved-note-actions">
                        <button class="btn btn-light btn-tiny" type="button" data-history-open="${item.id}">Edit</button>
                        <button class="btn btn-light btn-tiny" type="button" data-history-copy="${item.id}">Copy</button>
                        <button class="btn btn-light btn-tiny" type="button" data-history-export="${item.id}">Export</button>
                        <button class="btn btn-light btn-tiny" type="button" data-history-print="${item.id}">Print</button>
                        <button class="btn btn-danger btn-tiny" type="button" data-history-delete="${item.id}">Delete</button>
                    </div>
                </td>
            `;
            els.historyListEl.appendChild(row);
        });
    }

    function openHistoryItem(id) {
        const item = getLocalHistory().map(normaliseHistoryItem).find(x => String(x.id) === String(id));
        if (!item) return;

        state.currentNoteId = item.id;
        if (els.noteTitleEl) els.noteTitleEl.value = item.title || "";
        if (els.transcriptEl) els.transcriptEl.value = item.transcript || "";
        if (els.finalNoteEl) els.finalNoteEl.value = item.finalNote || "";
        if (els.aiDraftEl) els.aiDraftEl.value = item.finalNote || "";
        if (els.youngPersonNameEl) els.youngPersonNameEl.value = item.personName || "";
        setMeetingFormat(item.meetingFormat || "Not specified");

        setNoteMode(true);
        analyseDocument();
        openModal(els.workflowModalEl);
        setActiveTab("create");
        setSaveState("Ready");
        showToast("Saved note opened.");
    }

    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard.");
        } catch {
            alert("Could not copy to clipboard.");
        }
    }

    function downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }

    async function exportHistoryItem(id) {
        const item = getLocalHistory().map(normaliseHistoryItem).find(x => String(x.id) === String(id));
        if (!item) return;

        const usePdf = window.confirm("Press OK to export as PDF.\nPress Cancel to export as Word DOCX.");
        const format = usePdf ? "pdf" : "docx";

        const form = new FormData();
        form.append("title", item.title || "Care Note");
        form.append("final_note", item.finalNote || "");
        form.append("template_name", item.templateName || "");

        try {
            const response = await fetch(`/ai-notes/export/${format}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            if (!response.ok) {
                const data = await safeJson(response);
                alert(data.detail || "Export failed.");
                return;
            }

            const blob = await response.blob();
            downloadBlob(blob, `${item.title || "Care Note"}.${format}`);
            showToast(`Saved note exported as ${format.toUpperCase()}.`);
        } catch (error) {
            console.error(error);
            alert("Could not export this saved note.");
        }
    }

    function printHistoryItem(id) {
        const item = getLocalHistory().map(normaliseHistoryItem).find(x => String(x.id) === String(id));
        if (!item) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Print window was blocked by the browser.");
            return;
        }

        printWindow.document.write(`
            <html lang="en-GB">
            <head>
                <title>${escapeHtml(item.title)}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.6; color: #111827; }
                    h1 { font-size: 24px; margin-bottom: 10px; }
                    .meta { margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 14px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; font-size: 14px; }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(item.title || "Care Note")}</h1>
                <div class="meta">
                    Template: ${escapeHtml(item.templateName || "")}<br>
                    Person: ${escapeHtml(item.personName || "")}<br>
                    Updated: ${escapeHtml(new Date(item.updatedAt).toLocaleString("en-GB"))}
                </div>
                <pre>${escapeHtml(item.finalNote || "")}</pre>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    async function deleteSavedNote(id) {
        const item = getLocalHistory().map(normaliseHistoryItem).find(x => String(x.id) === String(id));
        if (!item) return;

        if (!window.confirm(`Delete "${item.title}"?`)) return;

        try {
            if (!item.isLocalOnly && item.id) {
                await fetch(`/ai-notes/${encodeURIComponent(item.id)}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                });
            }
        } catch (error) {
            console.warn("Delete request failed, removing locally.", error);
        }

        const next = getLocalHistory().filter(x => String(x.id) !== String(id));
        setLocalHistory(next);
        applyHistoryFiltersAndRender();
        showToast("Saved note deleted.");
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
                openModal(els.workflowModalEl);
                updateWorkflowStatus("Recording complete");
                showToast("Recording complete. Building your draft...");
                await transcribeAudio(true);
                await generateWorkingDocument(true);
            };

            state.mediaRecorder.onerror = () => {
                alert("Recording failed. Please try again.");
                resetRecordingUi();
            };

            state.mediaRecorder.start(1000);

            openModal(els.recordingModalEl);
            els.recordingModalMicEl?.classList.add("recording");
            els.recordingModalMicEl?.classList.remove("paused");
            if (els.recordingModalStatusEl) els.recordingModalStatusEl.textContent = "Recording live";
            if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = false;
            if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
            if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = false;

            startRecordingTimer();
            showToast("Recording started.");
        } catch (error) {
            console.error("Recording error:", error);
            alert("Unable to access the microphone. Please allow microphone access in your browser.");
        }
    }

    function resetRecordingUi() {
        stopRecordingTimer();
        closeModal(els.recordingModalEl);
        els.recordingModalMicEl?.classList.remove("recording", "paused");
        if (els.pauseRecordingBtn) els.pauseRecordingBtn.disabled = true;
        if (els.resumeRecordingBtn) els.resumeRecordingBtn.disabled = true;
        if (els.stopRecordingBtn) els.stopRecordingBtn.disabled = true;
        if (els.recordingModalTimerEl) els.recordingModalTimerEl.textContent = "00:00";
    }

    function pauseRecording() {
        if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
        state.mediaRecorder.pause();
        state.pausedAt = Date.now();
        els.recordingModalMicEl?.classList.remove("recording");
        els.recordingModalMicEl?.classList.add("paused");
        if (els.recordingModalStatusEl) els.recordingModalStatusEl.textContent = "Recording paused";
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

        els.recordingModalMicEl?.classList.remove("paused");
        els.recordingModalMicEl?.classList.add("recording");
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
        }
    }

    async function transcribeAudio(silent = false) {
        if (!state.recordedBlob) {
            if (!silent) alert("Please record audio first.");
            return;
        }

        const filename = `care-note.${state.recordingExtension || "webm"}`;
        const form = new FormData();
        form.append("file", state.recordedBlob, filename);

        try {
            if (!silent) setButtonLoading(els.transcribeBtn, true, "Transcribing...", "Transcribe recording");
            updateWorkflowStatus("Transcribing");

            const response = await fetch("/ai-notes/transcribe", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "Transcription failed.");
                return;
            }

            const transcript = String(data.transcript || "").trim();
            if (els.transcriptEl) els.transcriptEl.value = transcript;
            if (els.finalNoteEl && !els.finalNoteEl.value.trim()) els.finalNoteEl.value = transcript;
            if (els.aiDraftEl) els.aiDraftEl.value = transcript;

            state.previousFinalNote = transcript;
            state.previousAiDraft = transcript;

            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = smartDefaultTitle();
            }

            analyseDocument();
            markDirty();
            updateWorkflowStatus("Transcript ready");
            if (!silent) showToast("Transcription complete.");
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Could not connect to the transcription service.");
        } finally {
            if (!silent) setButtonLoading(els.transcribeBtn, false, "Transcribing...", "Transcribe recording");
        }
    }

    async function generateWorkingDocument(silent = false) {
        const transcript = els.transcriptEl?.value.trim();

        if (!transcript) {
            if (!silent) alert("Please transcribe audio first or paste a transcript.");
            return;
        }

        const template = getSelectedTemplate();
        const form = new FormData();
        form.append("text", transcript);
        form.append("mode", "custom");
        form.append("instruction", buildTemplateInstruction(template));

        try {
            if (!silent) setButtonLoading(els.generateBtn, true, "Creating...", "Create note");
            updateWorkflowStatus("Generating note");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "Document generation failed.");
                return;
            }

            const generated = String(data.text || transcript);
            state.previousFinalNote = els.finalNoteEl?.value || transcript;
            state.previousAiDraft = generated;

            if (els.finalNoteEl) els.finalNoteEl.value = generated;
            if (els.aiDraftEl) els.aiDraftEl.value = generated;

            if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
                els.noteTitleEl.value = deriveTitleFromText(generated) || smartDefaultTitle();
            }

            analyseDocument();
            markDirty();
            updateWorkflowStatus("Note ready");
            if (!silent) showToast("Care document generated.");
        } catch (error) {
            console.error("Generate document error:", error);
            alert("Could not connect to the AI service.");
        } finally {
            if (!silent) setButtonLoading(els.generateBtn, false, "Creating...", "Create note");
        }
    }

    async function reapplySelectedTemplate() {
        const currentText = els.finalNoteEl?.value.trim() || els.transcriptEl?.value.trim();
        if (!currentText) {
            alert("There is no content to restructure.");
            return;
        }

        const template = getSelectedTemplate();
        const form = new FormData();
        form.append("text", currentText);
        form.append("mode", "custom");
        form.append("instruction", buildTemplateInstruction(template));

        try {
            updateWorkflowStatus("Applying template");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "Could not apply the selected template.");
                return;
            }

            state.previousFinalNote = els.finalNoteEl?.value || "";
            if (els.finalNoteEl) els.finalNoteEl.value = data.text || currentText;

            analyseDocument();
            markDirty();
            updateWorkflowStatus("Template applied");
            showToast("Selected template applied.");
        } catch (error) {
            console.error("Reapply template error:", error);
            alert("Could not connect to the AI service.");
        }
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
            setButtonLoading(els.applyAiEditBtn, true, "Applying...", "Improve note");
            updateWorkflowStatus("Applying AI changes");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "AI change failed.");
                return;
            }

            if (els.finalNoteEl) els.finalNoteEl.value = data.text || currentText;
            analyseDocument();
            markDirty();
            updateWorkflowStatus("AI update applied");
            showToast("AI change applied.");
        } catch (error) {
            console.error("Apply AI change error:", error);
            alert("Could not connect to the AI service.");
        } finally {
            setButtonLoading(els.applyAiEditBtn, false, "Applying...", "Improve note");
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
        showToast("Draft restored.");
    }

    function insertBlankTemplate() {
        const template = getSelectedTemplate();
        if (!template || !els.finalNoteEl) return;

        els.finalNoteEl.value = template.sections.map(section => `${section}\n`).join("\n").trim();

        if (els.noteTitleEl && !els.noteTitleEl.value.trim()) {
            els.noteTitleEl.value = smartDefaultTitle();
        }

        analyseDocument();
        markDirty();
        showToast("Blank template inserted.");
    }

    function localActionFallback(text) {
        const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

        const actionIndicators = [
            "action", "actions", "agreed", "follow-up", "follow up",
            "next step", "next steps", "task", "tasks", "review date", "deadline"
        ];

        return lines
            .filter(line => actionIndicators.some(indicator => line.toLowerCase().includes(indicator)))
            .slice(0, 8)
            .map((line, index) => ({
                title: line.replace(/^[-•]\s*/, ""),
                owner: index % 2 === 0 ? "Staff team" : "Key worker",
                deadline: "Not specified",
                status: "Open"
            }));
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

    async function extractActionsAiFirst() {
        const text = els.finalNoteEl?.value.trim();
        if (!text) {
            alert("There is no document to extract actions from.");
            return;
        }

        try {
            setButtonLoading(els.extractActionsBtn, true, "Extracting...", "Extract actions");
            updateWorkflowStatus("Extracting actions");

            const form = new FormData();
            form.append("text", text);
            form.append("mode", "custom");
            form.append("instruction", [
                "Extract the action points from this care record.",
                "Return them as simple lines.",
                "For each action identify: title, owner, deadline, status.",
                "Do not invent information. If unclear, use 'Not specified'."
            ].join("\n"));

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                state.extractedActions = localActionFallback(text);
                renderExtractedActions();
                showToast(state.extractedActions.length ? "Actions extracted with fallback." : "No obvious actions found.");
                return;
            }

            const resultText = String(data.text || "");
            const lines = resultText.split("\n").map(line => line.trim()).filter(Boolean);

            state.extractedActions = lines.slice(0, 10).map(line => ({
                title: line.replace(/^[-•\d.]\s*/, ""),
                owner: "Not specified",
                deadline: "Not specified",
                status: "Open"
            }));

            if (!state.extractedActions.length) {
                state.extractedActions = localActionFallback(text);
            }

            renderExtractedActions();
            persistDraftLocally();
            showToast(state.extractedActions.length ? "Actions extracted." : "No obvious actions found.");
        } catch (error) {
            console.error(error);
            state.extractedActions = localActionFallback(text);
            renderExtractedActions();
            showToast(state.extractedActions.length ? "Actions extracted with fallback." : "No obvious actions found.");
        } finally {
            setButtonLoading(els.extractActionsBtn, false, "Extracting...", "Extract actions");
        }
    }

    async function createDerivedDocumentInstruction(instructionText, successMessage) {
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
            updateWorkflowStatus("Generating derived version");

            const response = await fetch("/ai-notes/edit", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "AI transformation failed.");
                return;
            }

            state.previousFinalNote = currentText;
            if (els.finalNoteEl) els.finalNoteEl.value = data.text || currentText;
            analyseDocument();
            markDirty();
            showToast(successMessage);
        } catch (error) {
            console.error(error);
            alert("Could not connect to the AI service.");
        }
    }

    async function createHandoverVersion() {
        await createDerivedDocumentInstruction(
            "Turn this into a concise handover-ready summary with immediate risks, health, appointments, medication, professional contact and priorities for the next shift.",
            "Handover version created."
        );
    }

    async function createManagerSummary() {
        await createDerivedDocumentInstruction(
            "Rewrite this into a concise manager update. Focus on key issues, risks, actions taken, decisions required and next steps.",
            "Manager summary created."
        );
    }

    async function saveDocument() {
        const transcript = els.transcriptEl?.value.trim();
        const finalNote = els.finalNoteEl?.value.trim();
        const title = els.noteTitleEl?.value.trim() || deriveTitleFromText(finalNote) || smartDefaultTitle();

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
        form.append("meeting_format", state.meetingFormat || "Not specified");
        form.append("record_author", els.recordAuthorEl?.value || "");
        form.append("young_person_name", els.youngPersonNameEl?.value || "");
        form.append("record_date", els.meetingDateEl?.value || "");
        form.append("location_context", els.locationContextEl?.value || "");

        if (state.currentNoteId) {
            form.append("note_id", String(state.currentNoteId));
        }

        try {
            if (els.saveBtn) els.saveBtn.disabled = true;
            if (els.saveBtnTop) els.saveBtnTop.disabled = true;
            setSaveState("Saving...");
            updateWorkflowStatus("Saving");

            const response = await fetch("/ai-notes/save", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                alert(data.detail || "Save failed.");
                setSaveState("Unsaved changes");
                return;
            }

            state.currentNoteId = data.id || data.record?.id || state.currentNoteId || `note-${Date.now()}`;
            setNoteMode(true);
            markSaved();

            upsertHistoryItem({
                id: state.currentNoteId,
                title,
                templateName: getSelectedTemplate()?.name || "",
                finalNote,
                transcript,
                personName: els.youngPersonNameEl?.value?.trim() || "",
                serviceType: els.serviceTypeEl?.value || "",
                shiftType: els.shiftTypeEl?.value || "",
                meetingFormat: state.meetingFormat || "Not specified",
                status: "Saved"
            });

            showToast("Document saved successfully.");
            updateWorkflowStatus("Saved");
        } catch (error) {
            console.error("Save error:", error);
            alert("Could not connect to the save service.");
            setSaveState("Unsaved changes");
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
                alert(data.detail || "Export failed.");
                return;
            }

            const blob = await response.blob();
            downloadBlob(blob, `${title}.${format}`);
            showToast(`Exported as ${format.toUpperCase()}.`);
        } catch (error) {
            console.error(error);
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
                        Meeting format: ${escapeHtml(state.meetingFormat || "Not specified")}<br>
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
        if (!window.confirm("Clear the transcript, working draft and current note details?")) return;

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
        setSaveState("Ready");
        renderExtractedActions();
        analyseDocument();
        localStorage.removeItem(LOCAL_DRAFT_KEY);
        state.hasUnsavedChanges = false;
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

    async function fetchCurrentUserWithToken(token) {
        const response = await fetch("/auth/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await safeJson(response);
        return { response, data };
    }

    async function verifySessionAndUnlockApp() {
        const token = getAccessToken();

        if (!token) {
            showAuthGate("Please sign in to continue.");
            return false;
        }

        try {
            const { response, data } = await fetchCurrentUserWithToken(token);

            if (response.ok) {
                hideAuthGate();
                return true;
            }

            if (response.status === 403) {
                showAuthGate("Your subscription is inactive. Start your subscription to access I-Notes.", "is-error");
                return false;
            }

            if (response.status === 401) {
                localStorage.removeItem(ACCESS_TOKEN_KEY);
                localStorage.removeItem("current_user");
                showAuthGate("Your session has expired. Please sign in again.", "is-error");
                return false;
            }

            showAuthGate(data.detail || "Could not verify your session.", "is-error");
            return false;
        } catch (error) {
            console.error(error);
            showAuthGate("Could not connect to the server. Please try again.", "is-error");
            return false;
        }
    }

    async function handleInlineLogin(event) {
        event.preventDefault();

        const email = els.authEmailEl?.value.trim() || "";
        const password = els.authPasswordEl?.value || "";

        if (!email || !password) {
            showAuthGate("Please enter your email and password.", "is-error");
            return;
        }

        try {
            setButtonLoading(els.authLoginBtn, true, "Signing in...", "Sign in");

            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await safeJson(response);

            if (!response.ok) {
                showAuthGate(data.detail || "Login failed.", "is-error");
                return;
            }

            if (data.access_token) {
                localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
            }
            if (data.user) {
                localStorage.setItem("current_user", JSON.stringify(data.user));
            }

            const unlocked = await verifySessionAndUnlockApp();
            if (unlocked) showToast("Signed in successfully.");
        } catch (error) {
            console.error(error);
            showAuthGate("Could not sign in. Please try again.", "is-error");
        } finally {
            setButtonLoading(els.authLoginBtn, false, "Signing in...", "Sign in");
        }
    }

    async function startSubscriptionCheckout() {
        const token = getAccessToken();

        if (!token) {
            showAuthGate("Sign in first, then start your subscription.", "is-error");
            return;
        }

        try {
            setButtonLoading(els.startSubscriptionBtn, true, "Redirecting...", "Start subscription");

            const response = await fetch("/billing/create-checkout-session", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await safeJson(response);

            if (!response.ok) {
                showAuthGate(data.detail || "Could not start subscription.", "is-error");
                return;
            }

            if (!data.url) {
                showAuthGate("No checkout URL was returned.", "is-error");
                return;
            }

            window.location.href = data.url;
        } catch (error) {
            console.error(error);
            showAuthGate("Could not connect to billing. Please try again.", "is-error");
        } finally {
            setButtonLoading(els.startSubscriptionBtn, false, "Redirecting...", "Start subscription");
        }
    }

    async function loadSavedHistoryFromServer() {
        try {
            const response = await fetch("/ai-notes/history", {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                applyHistoryFiltersAndRender();
                return;
            }

            const data = await safeJson(response);
            const items = Array.isArray(data.notes) ? data.notes : [];

            if (items.length) {
                const merged = [
                    ...items.map(normaliseHistoryItem),
                    ...getLocalHistory().map(normaliseHistoryItem)
                ].reduce((acc, item) => {
                    if (!acc.find(x => String(x.id) === String(item.id))) acc.push(item);
                    return acc;
                }, []).slice(0, 50);

                setLocalHistory(merged);
            }

            applyHistoryFiltersAndRender();
        } catch {
            applyHistoryFiltersAndRender();
        }
    }

    function handlePromptChipClick(event) {
        const prompt = event.target.getAttribute("data-transcript-action");
        if (!prompt || !els.aiInstructionEl) return;

        const map = {
            clean: "Clean this transcript only. Improve punctuation, readability and flow without changing meaning.",
            speakerize: "Format this transcript into clean speaker turns where possible. Do not invent speakers.",
            summarise: "Summarise this transcript into a concise factual overview suitable for care staff review."
        };

        els.aiInstructionEl.value = map[prompt] || "";
        markDirty();
        showToast("Transcript action added.");
    }

    function bindEvents() {
        els.authGateLoginFormEl?.addEventListener("submit", handleInlineLogin);
        els.startSubscriptionBtn?.addEventListener("click", startSubscriptionCheckout);

        els.logoutBtn?.addEventListener("click", () => {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem("current_user");
            showAuthGate("You have been logged out.", "is-success");
        });

        els.openCreateTabBtn?.addEventListener("click", () => setActiveTab("create"));
        els.openSavedTabBtn?.addEventListener("click", () => {
            setActiveTab("saved");
            applyHistoryFiltersAndRender();
        });

        els.savedNotesSearch?.addEventListener("input", applyHistoryFiltersAndRender);
        els.savedNotesFilter?.addEventListener("change", applyHistoryFiltersAndRender);

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
                updateTemplateUi();
                setDefaultAiInstruction(true);
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

        els.historyListEl?.addEventListener("click", async event => {
            const openId = event.target.getAttribute("data-history-open");
            const copyId = event.target.getAttribute("data-history-copy");
            const exportId = event.target.getAttribute("data-history-export");
            const printId = event.target.getAttribute("data-history-print");
            const deleteId = event.target.getAttribute("data-history-delete");

            if (openId) openHistoryItem(openId);
            if (copyId) {
                const item = getLocalHistory().map(normaliseHistoryItem).find(x => String(x.id) === String(copyId));
                if (item) await copyTextToClipboard(item.finalNote || "");
            }
            if (exportId) await exportHistoryItem(exportId);
            if (printId) printHistoryItem(printId);
            if (deleteId) await deleteSavedNote(deleteId);
        });

        els.refreshHistoryBtn?.addEventListener("click", loadSavedHistoryFromServer);

        els.startRecordingBtn?.addEventListener("click", startRecording);
        els.pauseRecordingBtn?.addEventListener("click", pauseRecording);
        els.resumeRecordingBtn?.addEventListener("click", resumeRecording);
        els.stopRecordingBtn?.addEventListener("click", stopRecording);

        els.closeWorkflowModalBtn?.addEventListener("click", () => closeModal(els.workflowModalEl));

        els.meetingModeOnlineBtn?.addEventListener("click", () => {
            setMeetingFormat("Online meeting");
            markDirty();
        });

        els.meetingModeInPersonBtn?.addEventListener("click", () => {
            setMeetingFormat("Meeting in person");
            markDirty();
        });

        els.meetingFormatEl?.addEventListener("change", () => {
            setMeetingFormat(els.meetingFormatEl.value);
            markDirty();
        });

        els.workflowMeetingFormatEl?.addEventListener("change", () => {
            setMeetingFormat(els.workflowMeetingFormatEl.value);
            markDirty();
        });

        els.templateSelectEl?.addEventListener("change", () => {
            updateTemplateUi();
            setDefaultAiInstruction();
            markDirty();
        });

        [
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
        ].forEach(el => {
            el?.addEventListener("input", () => {
                analyseDocument();
                markDirty();
            });
            el?.addEventListener("change", () => {
                analyseDocument();
                markDirty();
            });
        });

        els.transcribeBtn?.addEventListener("click", () => transcribeAudio(false));
        els.generateBtn?.addEventListener("click", () => generateWorkingDocument(false));
        els.reapplyTemplateBtn?.addEventListener("click", reapplySelectedTemplate);
        els.toggleTranscriptBtn?.addEventListener("click", toggleTranscriptVisibility);

        document.querySelectorAll(".prompt-chip[data-transcript-action]").forEach(btn => {
            btn.addEventListener("click", handlePromptChipClick);
        });

        els.applyAiEditBtn?.addEventListener("click", applyAiChange);
        els.undoAiEditBtn?.addEventListener("click", undoLastChange);
        els.copyDraftBtn?.addEventListener("click", resetFromGeneratedDraft);
        els.copyFinalBtn?.addEventListener("click", () => copyTextToClipboard(els.finalNoteEl?.value.trim() || ""));

        els.createHandoverBtn?.addEventListener("click", createHandoverVersion);
        els.createManagerSummaryBtn?.addEventListener("click", createManagerSummary);
        els.insertTemplateBtn?.addEventListener("click", insertBlankTemplate);
        els.extractActionsBtn?.addEventListener("click", extractActionsAiFirst);

        els.saveBtn?.addEventListener("click", saveDocument);
        els.saveBtnTop?.addEventListener("click", saveDocument);
        els.exportBtn?.addEventListener("click", exportDocument);
        els.exportBtnTop?.addEventListener("click", exportDocument);
        els.printBtn?.addEventListener("click", printDocument);
        els.printBtnTop?.addEventListener("click", printDocument);
        els.clearBtn?.addEventListener("click", clearAll);

        window.addEventListener("beforeunload", event => {
            if (!state.hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = "";
        });
    }

    async function init() {
        if (els.meetingDateEl && !els.meetingDateEl.value) {
            els.meetingDateEl.value = new Date().toISOString().slice(0, 10);
        }

        state.customTemplates = getLocalTemplates();
        populateTemplates();
        renderTemplateBuilderSections();
        renderSavedTemplates();
        renderExtractedActions();
        bindEvents();

        const sessionOk = await verifySessionAndUnlockApp();
        if (!sessionOk) return;

        restoreLocalDraft();
        if (!state.meetingFormat || state.meetingFormat === "Not specified") {
            setMeetingFormat(els.meetingFormatEl?.value || "Not specified");
        }

        setActiveTab("create");
        setSaveState("Ready");
        setNoteMode(Boolean(state.currentNoteId));
        updateTemplateUi();
        analyseDocument();
        if (els.transcribeBtn) els.transcribeBtn.disabled = !state.recordedBlob;
        await loadSavedHistoryFromServer();
    }

    init();
});
```
