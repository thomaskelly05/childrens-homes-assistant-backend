const DEFAULT_SECTIONS = {
  "Placement Plan": ["How life feels for me", "What helps me feel safe", "My day-to-day care", "Relationships and belonging", "Risks and support", "What adults must do", "Review and oversight"],
  "Care Plan": ["My lived experience", "Legal context", "Care objectives", "Current needs", "Family time", "Health", "Education", "Actions and outcomes"],
  "Risk Assessment": ["Current risks", "What may increase vulnerability", "Protective factors", "Control measures", "Child voice", "Escalation plan", "Review evidence"],
  "Behaviour Support Plan": ["Behaviour as communication", "Early signs", "Triggers and unmet needs", "De-escalation and regulation", "Repair and reflection", "What works", "Plan updates"],
  "Missing From Care Plan": ["Known risks", "Known locations", "Relationships and associates", "Prevention", "Immediate response", "Return-home work", "Learning and review"],
  "Health Care Plan": ["Health overview", "Medication", "Appointments", "Emotional wellbeing", "Sleep and diet", "Child voice", "Actions"],
  "Personal Education Plan": ["Education overview", "Attendance", "Strengths and aspirations", "Barriers", "Targets", "Support strategies", "Review notes"],
  "Communication Profile": ["How I communicate", "How I show distress", "How adults should communicate", "Choices and wishes", "What not to do"],
  "Sensory Profile": ["Sensory overview", "Triggers", "What helps", "Environment", "Regulation plan", "Review notes"],
  "Life Story / Identity": ["Who I am", "Culture and identity", "Important people", "Positive memories", "Achievements", "Wishes and feelings"],
  "Daily Record": ["What was the child’s lived experience today?", "Child voice", "Adult response", "Therapeutic reflection", "Outcome", "Next actions"],
  "Incident Record": ["What happened?", "What came before?", "What may the child have been communicating?", "Adult response", "Repair and recovery", "Learning", "Outcome"],
  "Safeguarding Record": ["Concern", "Immediate protection", "Notifications and oversight", "Child voice", "Outcome", "Follow-up"],
  "Direct Work": ["Purpose", "What happened", "Child voice", "Learning", "Outcome", "Next session"]
};

const DOCUMENT_STATUSES = ["draft", "ai_improved", "submitted_for_review", "changes_requested", "approved", "archived"];
const NARRATIVE_BLOCKS = [
  { key: "lived", label: "Lived experience", cue: "How did this feel for the child? Capture routine, emotion, relationships and meaning, not just events." },
  { key: "voice", label: "Child voice", cue: "What did the child say, show, choose, refuse, ask for, communicate or express non-verbally?" },
  { key: "safeguarding", label: "Safeguarding lens", cue: "Consider vulnerability, immediate safety, contextual safeguarding, notifications, protective action and follow-up." },
  { key: "therapeutic", label: "Therapeutic reflection", cue: "What may the behaviour or presentation communicate? Consider trauma, attachment, sensory needs, shame, anxiety and unmet need." },
  { key: "outcome", label: "Outcome and impact", cue: "What changed for the child? What evidence shows progress, safety, recovery, learning or continuing concern?" },
  { key: "oversight", label: "Leadership oversight", cue: "What needs manager review, plan update, supervision, QA, Reg 44/45 evidence or follow-up?" },
];

const REGULATORY_PROMPTS = {
  default: [
    "SCCIF lens: show how adults understand the child’s lived experience, wishes, feelings, progress and safety.",
    "Children’s Homes Regulations lens: evidence quality of care, safeguarding, leadership oversight, child-centred planning and positive outcomes.",
    "Ofsted lens: make the record clear, evidence-based, reflective and linked to what adults did next."
  ],
  safeguarding: [
    "SCCIF safeguarding lens: be clear about risk, immediate protection, professional notifications and how the child was supported.",
    "Regulation lens: evidence protection, oversight, review, safer care practice and timely follow-up.",
    "Ofsted lens: show that adults recognised risk, acted, escalated and learned."
  ],
  behaviour: [
    "Therapeutic lens: record behaviour as communication, not blame. Include triggers, emotional state, repair and learning.",
    "SCCIF lens: evidence how adults respond consistently, safely and with understanding.",
    "Ofsted lens: show whether plans need updating and whether intervention improved outcomes."
  ],
  voice: [
    "SCCIF lens: the child’s voice must be visible, meaningful and linked to action.",
    "Regulation lens: evidence wishes and feelings, consultation and participation.",
    "Ofsted lens: show what changed because the child was listened to."
  ],
  positive: [
    "Therapeutic lens: protect positive memories, belonging, achievement and identity.",
    "SCCIF lens: evidence progress, enjoyment, relationships and child-centred care.",
    "Ofsted lens: balance risk with strengths and lived experience."
  ]
};
let activeDocument = null;
let activeAutosaveTimer = null;

bootIndiCareDocumentProcessor();

function bootIndiCareDocumentProcessor() {
  if (window.IndiCareDocumentProcessor) return;
  window.IndiCareDocumentProcessor = { open: openDocumentProcessor, close: closeDocumentProcessor };
}

async function openDocumentProcessor(options = {}) {
  const ctx = context();
  const documentName = options.name || options.title || options.document?.document_type || "Placement Plan";
  const category = options.category || options.document?.document_group || "Child document";
  const sections = options.sections || DEFAULT_SECTIONS[documentName] || ["Overview", "Needs", "Risks", "Actions", "Review notes"];
  const records = await fetchRecords(ctx.childId);
  const evidence = buildEvidence(records, documentName);
  const memory = await fetchOperationalMemory(ctx.childId);
  const documentState = await loadDocumentState(ctx, documentName, category, sections, options);
  activeDocument = documentState;

  let modal = document.getElementById("indicare-document-processor");
  if (!modal) {
    modal = document.createElement("section");
    modal.id = "indicare-document-processor";
    modal.className = "indicare-document-processor narrative-os-processor";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="docos-shell narrative-os-shell" data-document-id="${escapeHtml(documentState.id || "")}">
      <header class="docos-header narrative-os-header">
        <div class="docos-title-block">
          <p class="eyebrow">IndiCare Narrative OS</p>
          <h2>${escapeHtml(documentName)}</h2>
          <p>${escapeHtml(category)} • ${escapeHtml(ctx.childName || "Selected child")} • <span id="docos-save-state">Ready</span></p>
        </div>
        <div class="docos-header-actions">
          <button type="button" class="secondary-action" data-doc-action="versions">Versions</button>
          <button type="button" class="secondary-action" data-doc-action="submit">Submit for review</button>
          <button type="button" class="secondary-action" data-doc-action="approve">Approve</button>
          <button type="button" class="primary-action" data-doc-action="save">Save</button>
          <button type="button" class="icon-button" data-doc-action="close" aria-label="Close document">×</button>
        </div>
      </header>

      <div class="docos-body narrative-os-body">
        <aside class="docos-left-rail narrative-os-left">
          <div class="docos-child-card"><div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div><div><strong>${escapeHtml(ctx.childName || "Selected child")}</strong><span>${escapeHtml(ctx.homeName || "Selected home")}</span></div></div>
          <nav class="docos-section-nav">${sections.map((section, index) => `<button type="button" class="docos-section-link ${index === 0 ? "active" : ""}" data-section-target="section-${index}">${escapeHtml(section)}</button>`).join("")}</nav>
          <div class="docos-status-card"><span>Status</span><strong id="docos-status-label">${escapeHtml(humanise(documentState.status))}</strong>${lifecycleStrip(documentState.status)}</div>
          ${renderMemorySnapshot(memory)}
        </aside>

        <main class="docos-editor narrative-os-editor" id="docos-editor">
          <div class="docos-paper narrative-canvas">
            <div class="docos-paper-header narrative-paper-header">
              <p class="eyebrow">Therapeutic narrative document</p>
              <h1 contenteditable="true" data-doc-title>${escapeHtml(documentState.editable_title || documentState.title || documentName)}</h1>
              <p contenteditable="true" data-doc-subtitle>${escapeHtml(documentState.metadata?.subtitle || `A child-centred IndiCare narrative for ${ctx.childName || "selected child"}.`)}</p>
            </div>
            ${renderNarrativeBlockPalette()}
            ${sections.map((section, index) => renderEditableSection(section, index, documentState.sections?.[section], documentName)).join("")}
          </div>
        </main>

        <aside class="docos-right-rail narrative-os-intelligence">
          <section class="docos-ai-card"><p class="eyebrow">IndiCare AI</p><h3>Therapeutic writing intelligence</h3><p>This is not a generic editor. IndiCare supports child voice, SCCIF, Ofsted evidence, safeguarding and therapeutic reflection while adults write.</p><button type="button" class="primary-action" data-doc-action="ai-improve">Improve narrative</button><button type="button" class="secondary-action" data-doc-action="evidence">Insert evidence</button></section>
          <section class="docos-panel"><p class="eyebrow">Regulatory guidance</p><h3>SCCIF / Ofsted lens</h3>${renderRegulatoryGuidance(documentName, category)}</section>
          <section class="docos-panel"><p class="eyebrow">Evidence from records</p><h3>Linked evidence</h3><div id="docos-evidence-list">${evidence.length ? evidence.map(renderEvidence).join("") : `<div class="empty-state">No linked evidence found yet. New records will appear here.</div>`}</div></section>
          <section class="docos-panel"><p class="eyebrow">Comments</p><h3>Review comments</h3><div id="docos-comments">${(documentState.comments || []).map((comment) => `<div class="alert low"><p>${escapeHtml(comment.comment || comment)}</p></div>`).join("") || `<div class="empty-state">No comments yet.</div>`}</div><textarea id="docos-comment-input" placeholder="Add manager comment, requested change or review note..."></textarea><button type="button" class="secondary-action" data-doc-action="comment">Add comment</button></section>
        </aside>
      </div>
    </div>`;

  bindProcessorActions(modal, ctx, documentName, category, sections, evidence);
  modal.classList.add("open");
  document.body.classList.add("document-processor-open");
  startAutosave(modal, ctx, documentName, category);
}

async function loadDocumentState(ctx, documentName, category, sections, options) {
  if (options.document) return { ...normaliseDocument(options.document), comments: await loadComments(options.document.id) };
  if (options.id) {
    const data = await getJson(`/child-documents/${encodeURIComponent(options.id)}`);
    if (data?.ok) return { ...normaliseDocument(data.document), comments: await loadComments(data.document.id) };
  }
  const existing = await findExistingDocument(ctx.childId, documentName);
  if (existing) return { ...normaliseDocument(existing), comments: await loadComments(existing.id) };
  const created = await postJson("/child-documents", { young_person_id: ctx.childId, home_id: ctx.homeId, child_name: ctx.childName, document_type: documentName, document_group: category, title: `${ctx.childName || "Young person"} - ${documentName} - ${todayIso()}`, document_date: todayIso(), created_time: currentTime(), status: "draft", sections: Object.fromEntries(sections.map((section) => [section, ""])) });
  if (created?.ok) return normaliseDocument(created.document);
  return loadLocalDocument(ctx.childId, documentName, sections);
}

function bindProcessorActions(modal, ctx, documentName, category, sections, evidence) {
  modal.querySelector("[data-doc-action='close']")?.addEventListener("click", closeDocumentProcessor);
  modal.querySelector("[data-doc-action='save']")?.addEventListener("click", () => saveDocumentFromProcessor(ctx, documentName, category, "draft"));
  modal.querySelector("[data-doc-action='submit']")?.addEventListener("click", () => saveDocumentFromProcessor(ctx, documentName, category, "submitted_for_review"));
  modal.querySelector("[data-doc-action='approve']")?.addEventListener("click", () => reviewDocument("approve"));
  modal.querySelector("[data-doc-action='ai-improve']")?.addEventListener("click", () => improveDocument(ctx, documentName, category, sections, evidence));
  modal.querySelector("[data-doc-action='evidence']")?.addEventListener("click", () => insertEvidence(evidence));
  modal.querySelector("[data-doc-action='comment']")?.addEventListener("click", () => addComment());
  modal.querySelector("[data-doc-action='versions']")?.addEventListener("click", () => showVersions());
  modal.querySelectorAll("[data-section-target]").forEach((button) => button.addEventListener("click", () => { modal.querySelectorAll(".docos-section-link").forEach((item) => item.classList.remove("active")); button.classList.add("active"); modal.querySelector(`#${button.dataset.sectionTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  modal.querySelectorAll("[data-narrative-block]").forEach((button) => button.addEventListener("click", () => insertNarrativeBlock(button.dataset.narrativeBlock)));
  modal.querySelectorAll("[contenteditable='true']").forEach((node) => node.addEventListener("input", () => scheduleAutosave(ctx, documentName, category)));
}

function renderEditableSection(section, index, value = "", documentName = "") {
  const promptType = promptTypeFor(section, documentName);
  const prompts = REGULATORY_PROMPTS[promptType] || REGULATORY_PROMPTS.default;
  return `<section class="docos-edit-section narrative-section" id="section-${index}" data-doc-section="${escapeHtml(section)}" data-narrative-type="${escapeHtml(promptType)}"><div class="docos-section-heading narrative-section-heading"><p class="eyebrow">Therapeutic heading ${index + 1}</p><h2>${escapeHtml(section)}</h2><div class="narrative-guidance">${prompts.map((prompt) => `<p>${escapeHtml(prompt)}</p>`).join("")}</div></div><div class="docos-editable narrative-editable" contenteditable="true" data-placeholder="Write ${escapeHtml(section.toLowerCase())} here...">${value || defaultSectionText(section, promptType)}</div></section>`;
}
function defaultSectionText(section, promptType = "default") { const block = NARRATIVE_BLOCKS.find((item) => item.key === promptType) || NARRATIVE_BLOCKS[0]; return `<div class="narrative-starter-block"><strong>${escapeHtml(block.label)}</strong><p>${escapeHtml(block.cue)}</p></div><p><strong>${escapeHtml(section)}</strong></p><p>Write naturally. IndiCare will support child voice, therapeutic reflection, safeguarding context, outcomes and oversight.</p>`; }
function renderNarrativeBlockPalette() { return `<div class="narrative-block-palette"><p class="eyebrow">Add care-native block</p>${NARRATIVE_BLOCKS.map((block) => `<button type="button" class="narrative-block-chip" data-narrative-block="${escapeHtml(block.key)}">${escapeHtml(block.label)}</button>`).join("")}</div>`; }
function insertNarrativeBlock(key) { const block = NARRATIVE_BLOCKS.find((item) => item.key === key) || NARRATIVE_BLOCKS[0]; const active = document.querySelector(".narrative-section .docos-editable"); if (!active) return; active.insertAdjacentHTML("beforeend", `<div class="narrative-inserted-block" data-block-type="${escapeHtml(block.key)}"><strong>${escapeHtml(block.label)}</strong><p>${escapeHtml(block.cue)}</p><p><br></p></div>`); toast(`${block.label} block added.`); }
function renderRegulatoryGuidance(documentName, category) { const promptType = promptTypeFor(documentName, category); const prompts = REGULATORY_PROMPTS[promptType] || REGULATORY_PROMPTS.default; return `<div class="narrative-list">${prompts.map((prompt) => `<div class="alert low"><p>${escapeHtml(prompt)}</p></div>`).join("")}</div>`; }
function promptTypeFor(section = "", documentName = "") { const text = `${section} ${documentName}`.toLowerCase(); if (/safeguard|risk|missing|protect|concern|police|exploitation/.test(text)) return "safeguarding"; if (/behaviour|incident|trigger|regulation|de-escalation|repair/.test(text)) return "behaviour"; if (/voice|wishes|feelings|communicate|choice/.test(text)) return "voice"; if (/positive|achievement|memory|identity|belonging|strength/.test(text)) return "positive"; if (/outcome|impact|review|oversight/.test(text)) return "outcome"; return "default"; }
function renderMemorySnapshot(memory) { if (!memory?.ok) return ""; return `<div class="docos-status-card narrative-memory-card"><span>Operational memory</span><strong>${escapeHtml(humanise(memory.emotional_state?.dominant || "building picture"))}</strong><p>Risk: ${escapeHtml(humanise(memory.risk_state?.level || "unknown"))}</p><p>${escapeHtml((memory.next_actions || [])[0] || "Continue recording lived experience and outcomes.")}</p></div>`; }

async function saveDocumentFromProcessor(ctx, name, category, status = "draft", quiet = false) {
  const payload = collectDocumentPayload(ctx, name, category, status);
  setSaveState("Saving...");
  let data = null;
  if (activeDocument?.id) data = await patchJson(`/child-documents/${encodeURIComponent(activeDocument.id)}`, payload);
  else data = await postJson("/child-documents", payload);
  if (data?.ok) {
    activeDocument = normaliseDocument(data.document);
    setSaveState(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    if (!quiet) toast(status === "submitted_for_review" ? "Document submitted for review." : "Document saved.");
    document.getElementById("docos-status-label").textContent = humanise(activeDocument.status || status);
    return data.document;
  }
  saveLocalFallback(ctx.childId, name, payload);
  setSaveState("Saved offline");
  if (!quiet) toast("Document saved locally because backend save was unavailable.");
  return null;
}

function collectDocumentPayload(ctx, name, category, status) {
  const sections = {};
  document.querySelectorAll("[data-doc-section]").forEach((section) => { sections[section.dataset.docSection] = section.querySelector(".docos-editable")?.innerHTML || ""; });
  const title = document.querySelector("[data-doc-title]")?.innerText?.trim() || name;
  const subtitle = document.querySelector("[data-doc-subtitle]")?.innerText?.trim() || "";
  return { young_person_id: ctx.childId, home_id: ctx.homeId, child_name: ctx.childName, document_type: activeDocument?.document_type || name, document_group: activeDocument?.document_group || category, title, editable_title: title, status, sections, metadata: { ...(activeDocument?.metadata || {}), subtitle, source: "indicare_narrative_os", processor: "therapeutic_narrative_processor" }, document_date: activeDocument?.document_date || todayIso(), created_time: activeDocument?.created_time || currentTime(), version_reason: status };
}

function startAutosave(modal, ctx, name, category) { clearTimeout(activeAutosaveTimer); modal.querySelectorAll("[contenteditable='true']").forEach((node) => node.addEventListener("input", () => scheduleAutosave(ctx, name, category))); }
function scheduleAutosave(ctx, name, category) { setSaveState("Editing..."); clearTimeout(activeAutosaveTimer); activeAutosaveTimer = setTimeout(() => saveDocumentFromProcessor(ctx, name, category, activeDocument?.status || "draft", true), 1600); }
function setSaveState(text) { const el = document.getElementById("docos-save-state"); if (el) el.textContent = text; }

async function improveDocument(ctx, documentName, category, sections, evidence) { const evidenceText = evidence.slice(0, 4).map((item) => `${item.title}: ${item.summary}`).join("\n"); document.querySelectorAll("[data-doc-section]").forEach((section) => { const name = section.dataset.docSection; const editable = section.querySelector(".docos-editable"); if (!editable) return; const current = editable.innerHTML.trim(); if (current && !current.includes("Start writing here")) return; editable.innerHTML = `<div class="narrative-inserted-block"><strong>IndiCare AI therapeutic draft</strong><p>Review recent records, child voice, adult response, SCCIF / Ofsted evidence and outcomes for this section.</p><p>${escapeHtml(evidenceText || "No linked evidence yet. Add recent records to strengthen this document.")}</p><p><em>Adult to review, edit and approve.</em></p></div>`; }); await saveDocumentFromProcessor(ctx, documentName, category, "ai_improved"); toast("IndiCare AI drafted therapeutic prompts from available evidence. Adults must review and edit."); }
function insertEvidence(evidence) { const active = document.querySelector(".docos-edit-section .docos-editable"); if (!active) return; active.insertAdjacentHTML("beforeend", evidence.length ? evidence.slice(0, 5).map((item) => `<div class="narrative-inserted-block"><strong>Evidence:</strong><p>${escapeHtml(item.title)} — ${escapeHtml(item.summary)}</p></div>`).join("") : `<div class="narrative-inserted-block"><strong>Evidence:</strong><p>No linked records available yet.</p></div>`); toast("Evidence inserted into the document."); }
async function addComment() { const input = document.getElementById("docos-comment-input"); const value = input?.value?.trim(); if (!value || !activeDocument?.id) return; const data = await postJson(`/child-documents/${encodeURIComponent(activeDocument.id)}/comments`, { comment: value }); if (data?.ok) { const comments = document.getElementById("docos-comments"); comments.insertAdjacentHTML("afterbegin", `<div class="alert low"><p>${escapeHtml(value)}</p></div>`); input.value = ""; toast("Comment added."); } }
async function reviewDocument(action) { if (!activeDocument?.id) return; const comment = document.getElementById("docos-comment-input")?.value || ""; const data = await postJson(`/child-documents/${encodeURIComponent(activeDocument.id)}/review`, { action, comment }); if (data?.ok) { activeDocument = normaliseDocument(data.document); document.getElementById("docos-status-label").textContent = humanise(activeDocument.status); toast(`Document ${humanise(activeDocument.status)}.`); } }
async function showVersions() { const panel = document.getElementById("docos-evidence-list"); if (!panel) return; if (!activeDocument?.id) { panel.innerHTML = `<div class="empty-state">Save this document before version history is available.</div>`; return; } const data = await getJson(`/child-documents/${encodeURIComponent(activeDocument.id)}/versions`); const versions = data?.versions || []; panel.innerHTML = versions.length ? versions.map((version) => `<div class="alert low"><strong>Version ${escapeHtml(version.version_number)}</strong><p>${escapeHtml(version.reason || "saved")} • ${escapeHtml(version.created_at || "")}</p></div>`).join("") : `<div class="empty-state">No saved versions yet.</div>`; }
function closeDocumentProcessor() { clearTimeout(activeAutosaveTimer); document.getElementById("indicare-document-processor")?.classList.remove("open"); document.body.classList.remove("document-processor-open"); window.loadDigitalChildFile?.(); }

async function findExistingDocument(childId, name) { const data = await getJson(`/child-documents?young_person_id=${encodeURIComponent(childId || "")}&query=${encodeURIComponent(name)}&include_archived=true&limit=25`); return (data?.documents || []).find((doc) => doc.document_type === name || doc.title?.includes(name)); }
async function loadComments(id) { if (!id) return []; const data = await getJson(`/child-documents/${encodeURIComponent(id)}/comments`); return data?.comments || []; }
function normaliseDocument(doc) { return { ...doc, sections: doc?.sections || {}, metadata: doc?.metadata || {}, status: doc?.status || "draft" }; }
function loadLocalDocument(childId, name, sections) { try { const stored = JSON.parse(localStorage.getItem(storageKey(childId, name)) || "null"); if (stored) return stored; } catch {} return { title: name, editable_title: name, document_type: name, document_group: "Child document", sections: Object.fromEntries(sections.map((section) => [section, ""])), comments: [], versions: [], metadata: {}, status: "draft" }; }
function saveLocalFallback(childId, name, payload) { localStorage.setItem(storageKey(childId, name), JSON.stringify({ ...payload, updated_at: new Date().toISOString() })); }
function storageKey(childId, name) { return `indicare-document:${childId || "no-child"}:${name}`; }

function buildEvidence(records, documentName) { const terms = documentName.toLowerCase().split(/\s+/).filter((word) => word.length > 3); return records.filter((record) => terms.some((term) => record.text.includes(term)) || documentEvidenceFallback(record, documentName)).slice(0, 10).map((record) => ({ title: record.title || humanise(record.type), summary: record.summary || record.content?.what_happened || record.content?.outcome || "Linked child record", type: record.type, status: record.status })); }
function documentEvidenceFallback(record, name) { const text = record.text || ""; if (/risk|behaviour|missing|safeguarding/i.test(name)) return /risk|incident|missing|safeguarding|police|harm|trigger|de-escalation/i.test(text); if (/education|personal education/i.test(name)) return /school|education|teacher|attendance|learning/i.test(text); if (/health/i.test(name)) return /health|camhs|medication|sleep|diet|doctor|dentist/i.test(text); if (/communication|sensory/i.test(name)) return /voice|communicat|sensory|overwhelm|regulation|noise|light/i.test(text); return /outcome|progress|voice|actions|review/i.test(text); }
async function fetchRecords(childId) { if (!childId) return []; const types = ["daily", "incident", "safeguarding", "missing"]; let all = []; for (const type of types) { try { const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&include_archived=true&limit=100`, { credentials: "include" }); const data = await response.json(); all = all.concat((data.records || []).map((record) => normaliseRecord(record, type))); } catch {} } return all; }
async function fetchOperationalMemory(childId) { if (!childId) return null; return await getJson(`/operational-memory/children/${encodeURIComponent(childId)}?days=5`); }
function normaliseRecord(record, type) { const content = record.content || {}; const text = `${record.title || ""} ${record.summary || ""} ${Object.values(content).join(" ")}`.toLowerCase(); return { ...record, type: record.record_type || type, content, text }; }
function renderEvidence(item) { return `<div class="docos-evidence-item"><span>${escapeHtml(humanise(item.type))}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(humanise(item.status || "draft"))}</small></div>`; }
function lifecycleStrip(status) { const current = String(status || "draft").toLowerCase(); return `<div class="record-lifecycle-strip compact">${DOCUMENT_STATUSES.map((step) => `<span class="lifecycle-pill ${step === current ? "active" : ""}">${escapeHtml(humanise(step))}</span>`).join("")}</div>`; }
function context() { return window.IndiCareContext?.get?.() || { childId: "", childName: "Selected child", homeId: "", homeName: "Selected home" }; }
async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch { return null; } }
async function postJson(url, payload) { try { const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch { return null; } }
async function patchJson(url, payload) { try { const response = await fetch(url, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch { return null; } }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function currentTime() { return new Date().toTimeString().slice(0, 5); }
function initials(name) { return String(name || "IC").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function toast(message) { const old = document.getElementById("indicare-toast"); old?.remove(); const el = document.createElement("div"); el.id = "indicare-toast"; el.className = "indicare-toast"; el.textContent = message; document.body.appendChild(el); setTimeout(() => el.remove(), 4200); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
