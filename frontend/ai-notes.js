const transcriptEl = document.getElementById("transcript");
const aiDraftEl = document.getElementById("aiDraft");
const finalNoteEl = document.getElementById("finalNote");
const safeguardingBoxEl = document.getElementById("safeguardingBox");
const safeguardingTextEl = document.getElementById("safeguardingText");
const childIdEl = document.getElementById("childId");
const staffIdEl = document.getElementById("staffId");
const audioFileEl = document.getElementById("audioFile");

let latestSafeguardingFlag = false;

async function transcribeAudio() {
    const file = audioFileEl.files[0];

    if (!file) {
        alert("Please choose an audio file first.");
        return;
    }

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/ai-notes/transcribe", {
        method: "POST",
        body: form
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.detail || "Transcription failed.");
        return;
    }

    transcriptEl.value = data.transcript || "";
}

async function generateNote() {
    const transcript = transcriptEl.value.trim();

    if (!transcript) {
        alert("Please add or transcribe some text first.");
        return;
    }

    const form = new FormData();
    form.append("transcript", transcript);

    const response = await fetch("/ai-notes/generate", {
        method: "POST",
        body: form
    });

    const data = await response.json();

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
}

async function saveNote() {
    const transcript = transcriptEl.value.trim();
    const aiDraft = aiDraftEl.value.trim();
    const finalNote = finalNoteEl.value.trim();
    const childId = childIdEl.value.trim();
    const staffId = staffIdEl.value.trim();

    if (!transcript || !aiDraft || !finalNote) {
        alert("Transcript, AI draft and final note are required.");
        return;
    }

    const form = new FormData();

    if (childId !== "") form.append("child_id", childId);
    if (staffId !== "") form.append("staff_id", staffId);

    form.append("transcript", transcript);
    form.append("ai_draft", aiDraft);
    form.append("final_note", finalNote);
    form.append("safeguarding_flag", String(latestSafeguardingFlag));

    const response = await fetch("/ai-notes/save", {
        method: "POST",
        body: form
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.detail || "Save failed.");
        return;
    }

    alert("AI note saved successfully.");
}

window.transcribeAudio = transcribeAudio;
window.generateNote = generateNote;
window.saveNote = saveNote;
