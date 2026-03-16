document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";
    const LOCAL_TEMPLATE_KEY = "indicare_custom_templates_v1";
    const LOCAL_DRAFT_KEY = "indicare_ai_notes_draft_v1";
    const LOCAL_HISTORY_KEY = "indicare_ai_notes_history_v1";

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
    const splitWorkspaceEl = document.getElementById("splitWorkspace");

    const transcriptEl = document.getElementById("transcript");
    const transcriptMirrorEl = document.getElementById("transcriptMirror");
    const finalNoteEl = document.getElementById("finalNote");
    const aiDraftEl = document.getElementById("aiDraft");
    const noteTitleEl = document.getElementById("noteTitle");
    const aiInstructionEl = document.getElementById("aiInstruction");
    const templateSelectEl = document.getElementById("templateSelect");

    const serviceTypeEl = document.getElementById("serviceType");
    const shiftTypeEl = document.getElementById("shiftType");
    const recordAuthorEl = document.getElementById("recordAuthor");
    const youngPersonNameEl = document.getElementById("youngPersonName");
    const meetingDateEl = document.getElementById("meetingDate");

    const recordingStatusEl = document.getElementById("recordingStatus");
    const recordingTimerEl = document.getElementById("recordingTimer");
    const statusIndicatorDotEl = document.getElementById("statusIndicatorDot");
    const audioReadyTextEl = document.getElementById("audioReadyText");
    const recordVisualCoreEl = document.getElementById("recordVisualCore");

    const noteModeBadgeEl = document.getElementById("noteModeBadge");
    const saveStateBadgeEl = document.getElementById("saveStateBadge");
    const documentQualityBadgeEl = document.getElementById("documentQualityBadge");

    const wordCountStatEl = document.getElementById("wordCountStat");
    const charCountStatEl = document.getElementById("charCountStat");
    const templateMiniStatEl = document.getElementById("templateMiniStat");
    const readinessStatEl = document.getElementById("readinessStat");
    const careLanguageStatEl = document.getElementById("careLanguageStat");
    const riskMarkerStatEl = document.getElementById("riskMarkerStat");
    const lastSaveStatEl = document.getElementById("lastSaveStat");

    const safeguardingBoxEl = document.getElementById("safeguardingBox");
    const safeguardingTextEl = document.getElementById("safeguardingText");

    const heroTemplateTextEl = document.getElementById("heroTemplateText");
    const heroRiskTextEl = document.getElementById("heroRiskText");
    const heroAutosaveTextEl = document.getElementById("heroAutosaveText");

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
    const stopRecordingModalBtn = document.getElementById("stopRecordingModalBtn");

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
            id: "placement-planning",
            name: "Placement planning meeting",
            sections: [
                "Meeting Title",
                "Date",
                "Young Person",
                "Attendees",
                "Current Needs",
                "Strengths and Protective Factors",
                "Placement Considerations",
                "Education / Health / Family Factors",
                "Risks and Safeguarding",
                "Decisions Made",
                "Actions",
                "Review Date"
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
        },
        {
            id: "medication-discussion",
            name: "Medication / health discussion",
            sections: [
                "Record Title",
                "Date",
                "Person Supported / Young Person",
                "Attendees",
                "Health Overview",
                "Medication Discussed",
                "Concerns Raised",
                "Advice / Professional Input",
                "Actions Agreed",
                "Monitoring Required",
                "Review Date"
            ]
        },
        {
            id: "child-review",
            name: "Child review meeting",
            sections: [
                "Meeting Title",
                "Date",
                "Young Person",
                "Attendees",
                "Purpose of Review",
                "Progress Since Last Review",
                "Current Presentation",
                "Education / Health / Relationships",
                "Concerns",
                "Young Person Voice",
                "Agreed Actions",
                "Review Arrangements"
            ]
        }
    ];

    const safeguardingKeywords = [
        "safeguarding", "assault", "self-harm", "self harm", "suicide", "sexual",
        "neglect", "abuse", "missing", "police", "injury", "restraint", "physical intervention",
        "knife", "weapon", "overdose", "exploitation", "cse", "cce", "violence", "threat",
        "bruise", "cut", "disclosure", "allegation", "abscond", "missing from home", "missing from placement"
    ];

    const personCentredKeywords = [
        "wishes", "feelings", "views", "choices", "voice", "presentation", "consent",
        "engagement", "supported", "explained", "encouraged", "offered", "agreed"
    ];

    let mediaRecorder = null;
    let recordingStream = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordingMimeType = "";
    let recordingExtension = "webm";
    let previousFinalNote = "";
    let previousAiDraft = "";
    let isTranscriptVisible = true;
    let currentTimerInterval = null;
    let recordingStartTime = null;
    let pausedAt = null;
    let totalPausedMs = 0;
    let customTemplates = [];
    let templateBuilderSections = [];
    let autosaveTimeout = null;
    let currentNoteId = null;

    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAccessToken();
        return token
            ? { ...extraHeaders, Authorization: `Bearer ${token}` }
            : { ...extraHeaders };
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
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("show");
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => toastEl.classList.remove("show"), 2600);
    }

    function setStatus(mode, label) {
        if (recordingStatusEl) {
            recordingStatusEl.textContent = label;
            recordingStatusEl.className = `status-pill ${mode}`;
        }

        if (statusIndicatorDotEl) {
            statusIndicatorDotEl.className = `live-dot ${mode}`;
        }

        if (mode === "recording" && recordVisualCoreEl) {
            recordVisualCoreEl.classList.add("recording");
        } else if (recordVisualCoreEl) {
            recordVisualCoreEl.classList.remove("recording");
        }
    }

    function setSaveState(state, label) {
        if (!saveStateBadgeEl) return;
        saveStateBadgeEl.className = `save-state-badge ${state}`;
        saveStateBadgeEl.textContent = label;
    }

    function setNoteMode(isEditing) {
        if (!noteModeBadgeEl) return;
        noteModeBadgeEl.className = isEditing
            ? "note-mode-badge is-editing"
            : "note-mode-badge is-new";
        noteModeBadgeEl.textContent = isEditing ? "Editing saved note" : "New unsaved note";
    }

    function formatTime(totalSeconds) {
        const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function startRecordingTimer() {
        stopRecordingTimer();
        recordingStartTime = Date.now();
        totalPausedMs = 0;
        pausedAt = null;

        currentTimerInterval = setInterval(() => {
            const elapsed = getElapsedRecordingSeconds();
            const formatted = formatTime(elapsed);
            if (recordingTimerEl) recordingTimerEl.textContent = formatted;
            if (recordingModalTimerEl) recordingModalTimerEl.textContent = formatted;
        }, 250);
    }

    function stopRecordingTimer() {
        if (currentTimerInterval) {
            clearInterval(currentTimerInterval);
            currentTimerInterval = null;
        }
    }

    function getElapsedRecordingSeconds() {
        if (!recordingStartTime) return 0;
        const now = pausedAt || Date.now();
        const elapsedMs = now - recordingStartTime - totalPausedMs;
        return Math.max(0, Math.floor(elapsedMs / 1000));
    }

    function openRecordingModal() {
        recordingModalEl?.classList.remove("hidden");
        if (recordingModalMicEl) {
            recordingModalMicEl.classList.add("recording");
            recordingModalMicEl.classList.remove("paused");
        }
        if (recordingModalStatusEl) {
            recordingModalStatusEl.textContent = "Recording live";
        }
        if (pauseRecordingBtn) pauseRecordingBtn.disabled = false;
        if (resumeRecordingBtn) resumeRecordingBtn.disabled = true;
        if (stopRecordingModalBtn) stopRecordingModalBtn.disabled = false;
    }

    function closeRecordingModal() {
        recordingModalEl?.classList.add("hidden");
        if (recordingModalMicEl) {
            recordingModalMicEl.classList.remove("recording", "paused");
        }
        if (pauseRecordingBtn) pauseRecordingBtn.disabled = true;
        if (resumeRecordingBtn) resumeRecordingBtn.disabled = true;
        if (stopRecordingModalBtn) stopRecordingModalBtn.disabled = true;
    }

    function showSplitWorkspace() {
        splitWorkspaceEl?.classList.add("active");
    }

    function hideSplitWorkspace() {
        splitWorkspaceEl?.classList.remove("active");
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
        return [...builtInTemplates, ...customTemplates];
    }

    function populateTemplates() {
        if (!templateSelectEl) return;

        const allTemplates = getAllTemplates();
        templateSelectEl.innerHTML = allTemplates
            .map(template => `<option value="${template.id}">${template.name}</option>`)
            .join("");

        updateSelectedTemplateUI();
    }

    function getSelectedTemplate() {
        const allTemplates = getAllTemplates();
        const selectedId = templateSelectEl?.value;
        return allTemplates.find(template => template.id === selectedId) || allTemplates[0];
    }

    function updateSelectedTemplateUI() {
        const template = getSelectedTemplate();
        if (templateMiniStatEl) templateMiniStatEl.textContent = template?.name || "—";
        if (heroTemplateTextEl) heroTemplateTextEl.textContent = template?.name || "—";
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "")
            .split("\n")
            .map(line => line.trim())
            .find(Boolean);

        return firstLine ? firstLine.replace(/[:#*-]/g, "").slice(0, 120) : "Care record";
    }

    function insertBlankTemplate() {
        const template = getSelectedTemplate();
        if (!template) return;

        const content = template.sections
            .map(section => `${section}\n`)
            .join("\n");

        finalNoteEl.value = content.trim();
        setDirtyState();
        analyseDocument();
        showToast("Blank template inserted.");
    }

    function buildCareContextBlock() {
        const parts = [
            `Service type: ${serviceTypeEl?.value || "Not specified"}`,
            `Shift or context: ${shiftTypeEl?.value || "Not specified"}`,
            `Recorded by: ${recordAuthorEl?.value.trim() || "Not specified"}`,
            `Person supported / young person: ${youngPersonNameEl?.value.trim() || "Not specified"}`,
            `Record date: ${meetingDateEl?.value || "Not specified"}`
        ];
        return parts.join("\n");
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

    function updateWordStats() {
        const text = finalNoteEl?.value || "";
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const charCount = text.length;

        if (wordCountStatEl) wordCountStatEl.textContent = String(wordCount);
        if (charCountStatEl) charCountStatEl.textContent = String(charCount);

        if (readinessStatEl) {
            readinessStatEl.textContent = wordCount < 30 ? "Draft" : wordCount < 120 ? "In progress" : "Substantial";
        }

        if (documentQualityBadgeEl) {
            documentQualityBadgeEl.textContent = wordCount < 30 ? "Care draft" : "Professionalising";
        }
    }

    function analyseSafeguarding(text) {
        const lower = String(text || "").toLowerCase();
        const matches = safeguardingKeywords.filter(keyword => lower.includes(keyword));
        const uniqueMatches = [...new Set(matches)];

        if (uniqueMatches.length) {
            safeguardingBoxEl?.classList.remove("hidden");
            safeguardingTextEl.textContent =
                `Potential safeguarding or risk-related language found: ${uniqueMatches.join(", ")}. Review for accuracy, management oversight, notifications, and immediate actions.`;
            if (riskMarkerStatEl) riskMarkerStatEl.textContent = `${uniqueMatches.length} marker${uniqueMatches.length > 1 ? "s" : ""}`;
            if (heroRiskTextEl) heroRiskTextEl.textContent = "Review advised";
        } else {
            safeguardingBoxEl?.classList.add("hidden");
            safeguardingTextEl.textContent = "";
            if (riskMarkerStatEl) riskMarkerStatEl.textContent = "None";
            if (heroRiskTextEl) heroRiskTextEl.textContent = "Monitoring";
        }
    }

    function analyseCareLanguage(text) {
        const lower = String(text || "").toLowerCase();
        const hasPersonCentred = personCentredKeywords.some(keyword => lower.includes(keyword));
        if (careLanguageStatEl) {
            careLanguageStatEl.textContent = hasPersonCentred ? "Strong" : "Basic";
        }
    }

    function analyseDocument() {
        const text = finalNoteEl?.value || "";
        updateWordStats();
        analyseSafeguarding(text);
        analyseCareLanguage(text);
        syncMirrorFields();
    }

    function syncMirrorFields() {
        if (aiDraftEl) aiDraftEl.value = finalNoteEl?.value || "";
        if (transcriptMirrorEl) transcriptMirrorEl.value = transcriptEl?.value || "";
    }

    function markSavedNow() {
        const now = new Date();
        const stamp = now.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
        if (lastSaveStatEl) lastSaveStatEl.textContent = stamp;
        setSaveState("is-saved", "Saved");
    }

    function setDirtyState() {
        setSaveState("is-dirty", "Unsaved changes");
        scheduleAutosave();
    }

    function scheduleAutosave() {
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(() => {
            persistDraftLocally();
            if (heroAutosaveTextEl) heroAutosaveTextEl.textContent = "Draft saved locally";
        }, 500);
    }

    function persistDraftLocally() {
        const payload = {
            transcript: transcriptEl?.value || "",
            finalNote: finalNoteEl?.value || "",
            aiDraft: aiDraftEl?.value || "",
            noteTitle: noteTitleEl?.value || "",
            aiInstruction: aiInstructionEl?.value || "",
            templateId: templateSelectEl?.value || "",
            serviceType: serviceTypeEl?.value || "",
            shiftType: shiftTypeEl?.value || "",
            recordAuthor: recordAuthorEl?.value || "",
            youngPersonName: youngPersonNameEl?.value || "",
            meetingDate: meetingDateEl?.value || "",
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
            serviceTypeEl.value = draft.serviceType || serviceTypeEl.value;
            shiftTypeEl.value = draft.shiftType || shiftTypeEl.value;
            recordAuthorEl.value = draft.recordAuthor || "";
            youngPersonNameEl.value = draft.youngPersonName || "";
            meetingDateEl.value = draft.meetingDate || "";
            if (draft.templateId && templateSelectEl.querySelector(`option[value="${draft.templateId}"]`)) {
                templateSelectEl.value = draft.templateId;
            }

            if ((draft.transcript || draft.finalNote) && splitWorkspaceEl) {
                showSplitWorkspace();
            }

            updateSelectedTemplateUI();
            analyseDocument();
        } catch (error) {
            console.warn("Could not restore local draft", error);
        }
    }

    function addToLocalHistory(item) {
        const existing = getLocalHistory();
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
            ...existing.filter(entry => entry.id !== item.id)
        ].slice(0, 12);

        localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(next));
        renderHistory();
    }

    function getLocalHistory() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || "[]");
        } catch {
            return [];
        }
    }

    function renderHistory() {
        if (!historyListEl || !historyEmptyStateEl) return;

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
                <div class="history-meta">
                    ${escapeHtml(item.templateName)} · ${new Date(item.updatedAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                    })}
                </div>
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
        const item = getLocalHistory().find(entry => entry.id === id);
        if (!item) return;

        currentNoteId = item.id;
        noteTitleEl.value = item.title || "";
        transcriptEl.value = item.transcript || "";
        finalNoteEl.value = item.finalNote || "";
        aiDraftEl.value = item.finalNote || "";
        showSplitWorkspace();
        setNoteMode(true);
        analyseDocument();
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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    async function startRecording() {
        try {
            recordedChunks = [];
            recordedBlob = null;

            if (audioPlaybackEl) {
                audioPlaybackEl.src = "";
                audioPlaybackEl.style.display = "none";
            }

            const recordingOption = getSupportedRecordingOptions();
            recordingMimeType = recordingOption.mimeType;
            recordingExtension = recordingOption.extension;

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

            mediaRecorder.ondataavailable = (event) => {
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

                recordedBlob = new Blob(recordedChunks, {
                    type: recordingMimeType || "audio/webm"
                });

                if (audioPlaybackEl) {
                    audioPlaybackEl.src = URL.createObjectURL(recordedBlob);
                    audioPlaybackEl.style.display = "block";
                }

                if (audioReadyTextEl) {
                    audioReadyTextEl.textContent = `Recording ready (${formatTime(getElapsedRecordingSeconds())}). You can now transcribe it.`;
                }

                if (recordingStream) {
                    recordingStream.getTracks().forEach(track => track.stop());
                }

                transcribeBtn.disabled = false;
                resetRecordingUi();
                showToast("Recording captured.");
            };

            mediaRecorder.onerror = () => {
                alert("Recording failed. Please try again.");
                resetRecordingUi();
            };

            mediaRecorder.start(1000);
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            transcribeBtn.disabled = true;

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

        if (recordingModalMicEl) {
            recordingModalMicEl.classList.remove("recording");
            recordingModalMicEl.classList.add("paused");
        }
        if (recordingModalStatusEl) {
            recordingModalStatusEl.textContent = "Recording paused";
        }
        pauseRecordingBtn.disabled = true;
        resumeRecordingBtn.disabled = false;
        setStatus("recording", "Recording paused");
    }

    function resumeRecording() {
        if (!mediaRecorder || mediaRecorder.state !== "paused") return;
        mediaRecorder.resume();

        if (pausedAt) {
            totalPausedMs += Date.now() - pausedAt;
            pausedAt = null;
        }

        if (recordingModalMicEl) {
            recordingModalMicEl.classList.remove("paused");
            recordingModalMicEl.classList.add("recording");
        }
        if (recordingModalStatusEl) {
            recordingModalStatusEl.textContent = "Recording live";
        }
        pauseRecordingBtn.disabled = false;
        resumeRecordingBtn.disabled = true;
        setStatus("recording", "Recording live");
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
        stopRecordingBtn.disabled = true;
        if (recordingTimerEl) recordingTimerEl.textContent = "00:00";
        if (recordingModalTimerEl) recordingModalTimerEl.textContent = "00:00";
        setStatus("idle", recordedBlob ? "Recording complete" : "Not recording");
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
            setStatus("processing", "Transcription in progress");
            if (recordingModalStatusEl) recordingModalStatusEl.textContent = "Preparing transcript";

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

            showSplitWorkspace();
            analyseDocument();
            setStatus("success", "Transcript ready");
            showToast("Transcription complete.");
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Could not connect to the transcription service.");
            setStatus("idle", "Not recording");
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

            showSplitWorkspace();
            analyseDocument();
            setStatus("success", "Document generated");
            setDirtyState();
            showToast("Working document generated.");
        } catch (error) {
            console.error("Generate document error:", error);
            alert("Could not connect to the AI service.");
            setStatus("idle", "Not recording");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate working document";
        }
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
            setStatus("idle", "Not recording");
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
        form.append("service_type", serviceTypeEl?.value || "");
        form.append("shift_type", shiftTypeEl?.value || "");
        form.append("record_author", recordAuthorEl?.value || "");
        form.append("young_person_name", youngPersonNameEl?.value || "");
        form.append("record_date", meetingDateEl?.value || "");

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
            markSavedNow();
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

        const usePdf = window.confirm(
            "Press OK to export as PDF.\nPress Cancel to export as Word DOCX."
        );

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

        const escapedTitle = escapeHtml(title);
        const escapedContent = escapeHtml(content);

        printWindow.document.write(`
            <html lang="en-GB">
                <head>
                    <title>${escapedTitle}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 30px;
                            line-height: 1.6;
                            color: #111827;
                        }
                        .meta {
                            margin-bottom: 20px;
                            padding-bottom: 14px;
                            border-bottom: 1px solid #e5e7eb;
                            color: #4b5563;
                            font-size: 14px;
                        }
                        h1 {
                            font-size: 24px;
                            margin-bottom: 10px;
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
                    <h1>${escapedTitle}</h1>
                    <div class="meta">
                        Template: ${escapeHtml(getSelectedTemplate()?.name || "Not specified")}<br>
                        Service: ${escapeHtml(serviceTypeEl?.value || "")}<br>
                        Shift / Context: ${escapeHtml(shiftTypeEl?.value || "")}<br>
                        Recorded by: ${escapeHtml(recordAuthorEl?.value || "")}<br>
                        Record date: ${escapeHtml(meetingDateEl?.value || "")}
                    </div>
                    <pre>${escapedContent}</pre>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function clearAll() {
        const confirmed = window.confirm("Clear the transcript, working draft, and current note details?");
        if (!confirmed) return;

        transcriptEl.value = "";
        finalNoteEl.value = "";
        aiDraftEl.value = "";
        aiInstructionEl.value = "";
        noteTitleEl.value = "";
        youngPersonNameEl.value = "";
        recordAuthorEl.value = "";
        previousFinalNote = "";
        previousAiDraft = "";
        currentNoteId = null;

        if (audioPlaybackEl) {
            audioPlaybackEl.src = "";
            audioPlaybackEl.style.display = "none";
        }

        recordedBlob = null;
        recordedChunks = [];
        hideSplitWorkspace();
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

        const mapping = {
            clean: "Clean this transcript only. Improve punctuation, readability and speaker flow without changing meaning or turning it into a formal note.",
            speakerize: "Format this transcript into clean speaker turns where possible. Do not invent speakers. Use neutral labels such as Speaker 1 and Speaker 2 if needed.",
            summarise: "Summarise this transcript into a concise factual overview suitable for care staff review."
        };

        aiInstructionEl.value = mapping[action] || "";
        showToast("Transcript action added to AI instruction.");
    }

    function toggleTranscriptVisibility() {
        isTranscriptVisible = !isTranscriptVisible;
        transcriptContentEl.style.display = isTranscriptVisible ? "" : "none";
        toggleTranscriptBtn.textContent = isTranscriptVisible ? "Show / hide" : "Show transcript";
    }

    function renderTemplateBuilderSections() {
        if (!templateSectionsListEl) return;

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
        if (!savedTemplatesListEl) return;

        savedTemplatesListEl.innerHTML = "";

        if (!customTemplates.length) {
            savedTemplatesListEl.innerHTML = `<div class="history-empty">No custom templates saved yet.</div>`;
            return;
        }

        customTemplates.forEach(template => {
            const item = document.createElement("div");
            item.className = "saved-template-item";
            item.innerHTML = `
                <div>
                    <strong>${escapeHtml(template.name)}</strong>
                    <div class="history-meta">${template.sections.length} sections</div>
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

        const id = `custom-${Date.now()}`;
        customTemplates.push({
            id,
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

    function openTemplateModal() {
        templateModalEl?.classList.remove("hidden");
    }

    function closeTemplateModal() {
        templateModalEl?.classList.add("hidden");
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
                const mapped = items.slice(0, 12).map(item => ({
                    id: item.id || `server-${Date.now()}-${Math.random()}`,
                    title: item.title || "Untitled care note",
                    templateName: item.template_name || "Saved note",
                    updatedAt: item.updated_at || new Date().toISOString(),
                    excerpt: (item.final_note || item.ai_draft || "").slice(0, 180),
                    finalNote: item.final_note || item.ai_draft || "",
                    transcript: item.transcript || ""
                }));

                localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(mapped));
            }

            renderHistory();
        } catch (error) {
            console.warn("History fetch unavailable, using local history only.", error);
            renderHistory();
        }
    }

    function bindHistoryEvents() {
        historyListEl?.addEventListener("click", async (event) => {
            const openId = event.target.getAttribute("data-history-open");
            const copyId = event.target.getAttribute("data-history-copy");

            if (openId) {
                openHistoryItem(openId);
            }

            if (copyId) {
                const item = getLocalHistory().find(entry => entry.id === copyId);
                if (item) {
                    await copyTextToClipboard(item.finalNote || "");
                }
            }
        });
    }

    function bindTemplateEvents() {
        openTemplateManagerBtn?.addEventListener("click", openTemplateModal);
        closeTemplateManagerBtn?.addEventListener("click", closeTemplateModal);
        addTemplateSectionBtn?.addEventListener("click", addTemplateSection);
        saveTemplateBtn?.addEventListener("click", saveCustomTemplate);

        templateSectionsListEl?.addEventListener("click", (event) => {
            const index = event.target.getAttribute("data-remove-template-section");
            if (index === null) return;
            templateBuilderSections.splice(Number(index), 1);
            renderTemplateBuilderSections();
        });

        savedTemplatesListEl?.addEventListener("click", (event) => {
            const useId = event.target.getAttribute("data-use-template");
            const deleteId = event.target.getAttribute("data-delete-template");

            if (useId) {
                templateSelectEl.value = useId;
                updateSelectedTemplateUI();
                closeTemplateModal();
                showToast("Template selected.");
            }

            if (deleteId) {
                customTemplates = customTemplates.filter(template => template.id !== deleteId);
                saveLocalTemplates(customTemplates);
                populateTemplates();
                renderSavedTemplates();
                showToast("Template deleted.");
            }
        });
    }

    function bindTextListeners() {
        [transcriptEl, finalNoteEl, noteTitleEl, aiInstructionEl, recordAuthorEl, youngPersonNameEl, meetingDateEl].forEach(el => {
            el?.addEventListener("input", () => {
                analyseDocument();
                setDirtyState();
            });
        });

        [serviceTypeEl, shiftTypeEl, templateSelectEl].forEach(el => {
            el?.addEventListener("change", () => {
                updateSelectedTemplateUI();
                analyseDocument();
                setDirtyState();
            });
        });
    }

    function bindEvents() {
        startRecordingBtn?.addEventListener("click", startRecording);
        stopRecordingBtn?.addEventListener("click", stopRecording);
        stopRecordingModalBtn?.addEventListener("click", stopRecording);
        pauseRecordingBtn?.addEventListener("click", pauseRecording);
        resumeRecordingBtn?.addEventListener("click", resumeRecording);

        transcribeBtn?.addEventListener("click", transcribeAudio);
        generateBtn?.addEventListener("click", generateWorkingDocument);

        applyAiEditBtn?.addEventListener("click", applyAiChange);
        undoAiEditBtn?.addEventListener("click", undoLastChange);
        copyDraftBtn?.addEventListener("click", resetFromGeneratedDraft);
        insertTemplateBtn?.addEventListener("click", insertBlankTemplate);

        saveBtn?.addEventListener("click", saveDocument);
        saveBtnTop?.addEventListener("click", saveDocument);

        exportBtn?.addEventListener("click", exportDocument);
        exportBtnTop?.addEventListener("click", exportDocument);

        printBtn?.addEventListener("click", printDocument);
        printBtnTop?.addEventListener("click", printDocument);

        clearBtn?.addEventListener("click", clearAll);

        copyFinalBtn?.addEventListener("click", () => copyTextToClipboard(finalNoteEl.value.trim()));

        document.querySelectorAll(".prompt-chip[data-prompt]").forEach(btn => {
            btn.addEventListener("click", handlePromptChipClick);
        });

        document.querySelectorAll(".prompt-chip[data-transcript-action]").forEach(btn => {
            btn.addEventListener("click", handleTranscriptToolClick);
        });

        toggleTranscriptBtn?.addEventListener("click", toggleTranscriptVisibility);
        refreshHistoryBtn?.addEventListener("click", loadSavedHistoryFromServer);

        bindTextListeners();
        bindTemplateEvents();
        bindHistoryEvents();

        document.addEventListener("keydown", (event) => {
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
        });
    }

    function init() {
        if (!getAccessToken()) {
            redirectToLogin();
            return;
        }

        customTemplates = getLocalTemplates();
        populateTemplates();
        renderTemplateBuilderSections();
        renderSavedTemplates();
        renderHistory();

        hideSplitWorkspace();
        stopRecordingBtn.disabled = true;
        transcribeBtn.disabled = true;
        setSaveState("is-idle", "Ready");
        setNoteMode(false);
        meetingDateEl.value = new Date().toISOString().slice(0, 10);

        restoreLocalDraft();
        updateSelectedTemplateUI();
        analyseDocument();
        bindEvents();
        loadSavedHistoryFromServer();
    }

    init();
});
