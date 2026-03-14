document.addEventListener("DOMContentLoaded", () => {
    const ACCESS_TOKEN_KEY = "access_token";

    const startRecordingBtn = document.getElementById("startRecordingBtn");
    const stopRecordingBtn = document.getElementById("stopRecordingBtn");
    const transcribeBtn = document.getElementById("transcribeBtn");
    const generateBtn = document.getElementById("generateBtn");

    const audioPlaybackEl = document.getElementById("audioPlayback");
    const splitWorkspaceEl = document.getElementById("splitWorkspace");

    const transcriptEl = document.getElementById("transcript");
    const finalNoteEl = document.getElementById("finalNote");
    const noteTitleEl = document.getElementById("noteTitle");
    const aiInstructionEl = document.getElementById("aiInstruction");
    const templateSelectEl = document.getElementById("templateSelect");

    const applyAiEditBtn = document.getElementById("applyAiEditBtn");
    const undoAiEditBtn = document.getElementById("undoAiEditBtn");

    const saveBtn = document.getElementById("saveBtn");
    const exportBtn = document.getElementById("exportBtn");
    const printBtn = document.getElementById("printBtn");
    const clearBtn = document.getElementById("clearBtn");

    const builtInTemplates = [
        {
            id: "general-meeting",
            name: "General meeting note",
            sections: [
                "Meeting Title",
                "Date",
                "Attendees",
                "Purpose of Meeting",
                "Summary",
                "Key Discussion Points",
                "Decisions Made",
                "Actions",
                "Next Steps",
                "Review Date"
            ]
        },
        {
            id: "staff-supervision",
            name: "Staff supervision note",
            sections: [
                "Supervision Title",
                "Date",
                "Supervisor",
                "Staff Member",
                "Purpose",
                "Discussion Summary",
                "Practice Reflections",
                "Strengths",
                "Areas for Development",
                "Actions Agreed",
                "Review Date"
            ]
        },
        {
            id: "handover-note",
            name: "Shift handover note",
            sections: [
                "Shift",
                "Date",
                "Young People Overview",
                "Significant Events",
                "Health",
                "Medication",
                "Education",
                "Appointments",
                "Visitors / Contacts",
                "Risks / Concerns",
                "Actions for Next Shift"
            ]
        },
        {
            id: "incident-review",
            name: "Incident review",
            sections: [
                "Incident Title",
                "Date",
                "People Involved",
                "Incident Summary",
                "What Happened",
                "Immediate Response",
                "Impact",
                "Discussion",
                "Learning",
                "Actions",
                "Follow-Up"
            ]
        },
        {
            id: "manager-update",
            name: "Manager update",
            sections: [
                "Update Title",
                "Date",
                "Summary",
                "Current Position",
                "Key Concerns",
                "Actions Taken",
                "Decisions Needed",
                "Recommended Next Steps"
            ]
        },
        {
            id: "team-meeting",
            name: "Team meeting minutes",
            sections: [
                "Meeting Title",
                "Date",
                "Chair",
                "Attendees",
                "Apologies",
                "Agenda Items",
                "Discussion",
                "Decisions",
                "Actions",
                "Next Meeting Date"
            ]
        },
        {
            id: "placement-planning",
            name: "Placement planning meeting",
            sections: [
                "Meeting Overview",
                "Date",
                "Attendees",
                "Current Needs",
                "Strengths",
                "Risks",
                "Placement Planning Discussion",
                "Decisions",
                "Actions",
                "Review Date"
            ]
        },
        {
            id: "child-review-meeting",
            name: "Child review meeting note",
            sections: [
                "Meeting Title",
                "Date",
                "Young Person",
                "Attendees",
                "Purpose of Review",
                "Current Presentation",
                "Progress Since Last Review",
                "Concerns",
                "Agreed Actions",
                "Review Arrangements"
            ]
        },
        {
            id: "keywork-session",
            name: "Key-work session note",
            sections: [
                "Session Title",
                "Date",
                "Young Person",
                "Purpose",
                "Topics Discussed",
                "Young Person Views",
                "Staff Reflection",
                "Actions / Follow-Up"
            ]
        },
        {
            id: "risk-discussion",
            name: "Risk discussion note",
            sections: [
                "Discussion Title",
                "Date",
                "Attendees",
                "Presenting Risk",
                "Known Triggers / Indicators",
                "Protective Factors",
                "Discussion Summary",
                "Agreed Controls",
                "Actions",
                "Review Date"
            ]
        },
        {
            id: "education-meeting",
            name: "Education meeting note",
            sections: [
                "Meeting Title",
                "Date",
                "Young Person",
                "Attendees",
                "Attendance / Engagement",
                "Current Concerns",
                "Discussion",
                "Support Strategies",
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
                "Information Shared",
                "Immediate Actions",
                "Who Was Informed",
                "Next Steps",
                "Manager Review"
            ]
        },
        {
            id: "health-meeting",
            name: "Health / medication discussion",
            sections: [
                "Meeting Title",
                "Date",
                "Young Person",
                "Attendees",
                "Health Overview",
                "Medication Discussion",
                "Concerns Raised",
                "Agreed Actions",
                "Review Date"
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
                "Information Shared",
                "Discussion Summary",
                "Decisions",
                "Actions",
                "Timescales",
                "Review Arrangements"
            ]
        },
        {
            id: "staff-reflection",
            name: "Staff reflective discussion",
            sections: [
                "Discussion Title",
                "Date",
                "Staff Member",
                "Context",
                "Reflection Summary",
                "Learning Identified",
                "Support Needed",
                "Actions Agreed",
                "Review Date"
            ]
        }
    ];

    let mediaRecorder = null;
    let recordingStream = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordingMimeType = "";
    let recordingExtension = "webm";
    let previousFinalNote = "";

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

    function populateTemplates() {
        if (!templateSelectEl) return;

        templateSelectEl.innerHTML = builtInTemplates
            .map(template => `<option value="${template.id}">${template.name}</option>`)
            .join("");
    }

    function getSelectedTemplate() {
        const selectedId = templateSelectEl?.value;
        return builtInTemplates.find(template => template.id === selectedId) || builtInTemplates[0];
    }

    function deriveTitleFromText(text) {
        const firstLine = String(text || "")
            .split("\n")
            .map(line => line.trim())
            .find(Boolean);

        return firstLine ? firstLine.slice(0, 120) : "Working document";
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

            recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
                    return;
                }

                recordedBlob = new Blob(
                    recordedChunks,
                    { type: recordingMimeType || "audio/webm" }
                );

                if (audioPlaybackEl) {
                    audioPlaybackEl.src = URL.createObjectURL(recordedBlob);
                    audioPlaybackEl.style.display = "block";
                }

                stopRecordingBtn.disabled = true;
                startRecordingBtn.disabled = false;
                transcribeBtn.disabled = false;

                if (recordingStream) {
                    recordingStream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.onerror = () => {
                alert("Recording failed. Please try again.");
                stopRecordingBtn.disabled = true;
                startRecordingBtn.disabled = false;
            };

            mediaRecorder.start(1000);

            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            transcribeBtn.disabled = true;
        } catch (error) {
            console.error("Recording error:", error);
            alert("Unable to access the microphone. Please allow microphone access in your browser.");
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
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

        const filename = `meeting.${recordingExtension || "webm"}`;
        const form = new FormData();
        form.append("file", recordedBlob, filename);

        try {
            transcribeBtn.disabled = true;
            transcribeBtn.textContent = "Transcribing...";

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
            previousFinalNote = transcript;

            if (!noteTitleEl.value.trim()) {
                noteTitleEl.value = "Transcribed meeting note";
            }

            showSplitWorkspace();
        } catch (error) {
            console.error("Transcription error:", error);
            alert("Could not connect to the transcription service.");
        } finally {
            transcribeBtn.disabled = false;
            transcribeBtn.textContent = "Transcribe";
        }
    }

    function buildTemplateInstruction(template) {
        return `Rewrite this into a professional residential children's home document using these exact headings:\n${template.sections.map(section => `- ${section}`).join("\n")}\n\nKeep to the information provided. Do not invent facts.`;
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

            finalNoteEl.value = generated;
            previousFinalNote = generated;

            if (!noteTitleEl.value.trim()) {
                noteTitleEl.value = deriveTitleFromText(generated);
            }

            showSplitWorkspace();
        } catch (error) {
            console.error("Generate document error:", error);
            alert("Could not connect to the AI service.");
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Document";
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
        form.append("instruction", instruction);

        try {
            applyAiEditBtn.disabled = true;
            applyAiEditBtn.textContent = "Applying...";

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
        } catch (error) {
            console.error("Apply AI change error:", error);
            alert("Could not connect to the AI service.");
        } finally {
            applyAiEditBtn.disabled = false;
            applyAiEditBtn.textContent = "Apply AI Change";
        }
    }

    function undoLastChange() {
        if (!previousFinalNote) {
            alert("There is no previous version to restore.");
            return;
        }

        finalNoteEl.value = previousFinalNote;
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
        form.append("ai_draft", finalNote);
        form.append("final_note", finalNote);
        form.append("title", title);

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            const response = await fetch("/ai-notes/save", {
                method: "POST",
                headers: getAuthHeaders(),
                body: form
            });

            const data = await safeJson(response);

            if (!response.ok) {
                if (handleUnauthorized(response, data)) return;
                alert(data.detail || "Save failed.");
                return;
            }

            alert("Document saved successfully.");
        } catch (error) {
            console.error("Save error:", error);
            alert("Could not connect to the save service.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
    }

    async function exportDocument() {
        const finalNote = finalNoteEl.value.trim();
        const title = noteTitleEl.value.trim() || "AI Note";

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
        form.append("template_name", getSelectedTemplate().name);

        try {
            exportBtn.disabled = true;
            exportBtn.textContent = "Exporting...";

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
        } catch (error) {
            console.error("Export error:", error);
            alert("Could not connect to the export service.");
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = "Export";
        }
    }

    function printDocument() {
        const title = noteTitleEl.value.trim() || "AI Note";
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

        const escapedTitle = title
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const escapedContent = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        printWindow.document.write(`
            <html>
                <head>
                    <title>${escapedTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; color: #111827; }
                        h1 { font-size: 22px; margin-bottom: 18px; }
                        pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>${escapedTitle}</h1>
                    <pre>${escapedContent}</pre>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    function clearAll() {
        const confirmed = window.confirm("Clear the transcript and document?");
        if (!confirmed) return;

        transcriptEl.value = "";
        finalNoteEl.value = "";
        aiInstructionEl.value = "";
        noteTitleEl.value = "";
        previousFinalNote = "";

        if (audioPlaybackEl) {
            audioPlaybackEl.src = "";
            audioPlaybackEl.style.display = "none";
        }

        recordedBlob = null;
        recordedChunks = [];
        hideSplitWorkspace();
        transcribeBtn.disabled = true;
    }

    function bindEvents() {
        startRecordingBtn?.addEventListener("click", startRecording);
        stopRecordingBtn?.addEventListener("click", stopRecording);
        transcribeBtn?.addEventListener("click", transcribeAudio);
        generateBtn?.addEventListener("click", generateWorkingDocument);

        applyAiEditBtn?.addEventListener("click", applyAiChange);
        undoAiEditBtn?.addEventListener("click", undoLastChange);

        saveBtn?.addEventListener("click", saveDocument);
        exportBtn?.addEventListener("click", exportDocument);
        printBtn?.addEventListener("click", printDocument);
        clearBtn?.addEventListener("click", clearAll);
    }

    function init() {
        if (!getAccessToken()) {
            redirectToLogin();
            return;
        }

        populateTemplates();
        hideSplitWorkspace();
        stopRecordingBtn.disabled = true;
        transcribeBtn.disabled = true;
        bindEvents();
    }

    init();
});
