const DEFAULT_SECTIONS = {
  "Placement Plan": ["About me", "My day-to-day care", "Routines", "Relationships", "Risks and support", "What adults must do", "Review notes"],
  "Care Plan": ["Legal context", "Care objectives", "Current needs", "Family time", "Health", "Education", "Actions"],
  "Risk Assessment": ["Current risks", "Triggers", "Protective factors", "Control measures", "Escalation plan", "Review evidence"],
  "Behaviour Support Plan": ["Behaviour as communication", "Early signs", "Triggers", "De-escalation", "Repair and reflection", "What works", "Plan updates"],
  "Missing From Care Plan": ["Known risks", "Known locations", "Associates", "Prevention", "Immediate response", "Return-home work", "Learning"],
  "Health Care Plan": ["Health overview", "Medication", "Appointments", "CAMHS / emotional wellbeing", "Sleep and diet", "Actions"],
  "Personal Education Plan": ["Education overview", "Attendance", "Strengths", "Barriers", "Targets", "Support strategies", "Review notes"],
  "Communication Profile": ["How I communicate", "How I show distress", "How adults should communicate", "Choices and wishes", "What not to do"],
  "Sensory Profile": ["Sensory overview", "Triggers", "What helps", "Environment", "Regulation plan", "Review notes"],
  "Life Story / Identity": ["Who I am", "Culture and identity", "Important people", "Memories", "Achievements", "Wishes and feelings"],
  "Daily Record": ["What happened", "Child voice", "Adult response", "Reflection", "Outcome", "Next actions"],
  "Incident Record": ["What happened", "Antecedent / trigger", "Child voice", "Adult response", "Debrief", "Learning", "Outcome"],
  "Safeguarding Record": ["Concern", "Immediate action", "Notifications", "Child voice", "Outcome", "Follow-up"],
  "Direct Work": ["Purpose", "What happened", "Child voice", "Learning", "Outcome", "Next session"]
};

const DOCUMENT_STATUSES = ["draft", "ai_improved", "submitted_for_review", "changes_requested", "approved", "archived"];
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
  const documentState = await loadDocumentState(ctx, documentName, category, sections, options);
  activeDocument = documentState;

  let modal = document.getElementById("indicare-document-processor");
  if (!modal) {
    modal = document.createElement("section");
    modal.id = "indicare-document-processor";
    modal.className = "indicare-document-processor";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="docos-shell" data-document-id="${escapeHtml(documentState.id || "")}">
      <header class="docos-header">
        <div class="docos-title-block">
          <p class="eyebrow">IndiCare DOC OS</p>
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

      <div class="docos-body">
        <aside class="docos-left-rail">
          <div class="docos-child-card"><div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div><div><strong>${escapeHtml(ctx.childName || "Selected child")}</strong><span>${escapeHtml(ctx.homeName || "Selected home")}</span></div></div>
          <nav class="docos-section-nav">${sections.map((section, index) => `<button type="button" class="docos-section-link ${index === 0 ? "active" : ""}" data-section-target="section-${index}">${escapeHtml(section)}</button>`).join("")}</nav>
          <div class="docos-status-card"><span>Status</span><strong id="docos-status-label">${escapeHtml(humanise(documentState.status))}</strong>${lifecycleStrip(documentState.status)}</div>
        </aside>

        <main class="docos-editor" id="docos-editor">
          <div class="docos-paper">
            <div class="docos-paper-header">
              <p class="eyebrow">Live document</p>
              <h1 contenteditable="true" data-doc-title>${escapeHtml(documentState.editable_title || documentState.title || documentName)}</h1>
              <p contenteditable="true" data-doc-subtitle>${escapeHtml(documentState.metadata?.subtitle || `Working document for ${ctx.childName || "selected child"}.`)}</p>
            </div>
            ${sections.map((section, index) => renderEditableSection(section, index, documentState.sections?.[section])).join("")}
          </div>
        </main>

        <aside class="docos-right-rail">
          <section class="docos-ai-card"><p class="eyebrow">IndiCare AI</p><h3>Document intelligence</h3><p>Use records, chronology and child voice to improve this document.</p><button type="button" class="primary-action" data-doc-action="ai-improve">Improve document</button><button type="button" class="secondary-action" data-doc-action="evidence">Insert evidence</button></section>
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
  modal.querySelectorAll("[contenteditable='true']").forEach((node) => node.addEventListener("input", () => scheduleAutosave(ctx, documentName, category)));
}

function renderEditableSection(section, index, value = "") { return `<section class="docos-edit-section" id="section-${index}" data-doc-section="${escapeHtml(section)}"><div class="docos-section-heading"><p class="eyebrow">Section ${index + 1}</p><h2>${escapeHtml(section)}</h2></div><div class="docos-editable" contenteditable="true" data-placeholder="Write ${escapeHtml(section.toLowerCase())} here...">${value || defaultSectionText(section)}</div></section>`; }
function defaultSectionText(section) { return `<p><strong>${escapeHtml(section)}</strong></p><p>Start writing here. Use IndiCare AI to pull evidence from records, child voice, adult response, safeguarding and outcomes.</p>`; }

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
  return { young_person_id: ctx.childId, home_id: ctx.homeId, child_name: ctx.childName, document_type: activeDocument?.document_type || name, document_group: activeDocument?.document_group || category, title, editable_title: title, status, sections, metadata: { ...(activeDocument?.metadata || {}), subtitle, source: "indicare_doc_os" }, document_date: activeDocument?.document_date || todayIso(), created_time: activeDocument?.created_time || currentTime(), version_reason: status };
}

function startAutosave(modal, ctx, name, category) { clearTimeout(activeAutosaveTimer); modal.querySelectorAll("[contenteditable='true']").forEach((node) => node.addEventListener("input", () => scheduleAutosave(ctx, name, category))); }
function scheduleAutosave(ctx, name, category) { setSaveState("Editing..."); clearTimeout(activeAutosaveTimer); activeAutosaveTimer = setTimeout(() => saveDocumentFromProcessor(ctx, name, category, activeDocument?.status || "draft", true), 1600); }
function setSaveState(text) { const el = document.getElementById("docos-save-state"); if (el) el.textContent = text; }

async function improveDocument(ctx, documentName, category, sections, evidence) { const evidenceText = evidence.slice(0, 4).map((item) => `${item.title}: ${item.summary}`).join("\n"); document.querySelectorAll("[data-doc-section]").forEach((section) => { const name = section.dataset.docSection; const editable = section.querySelector(".docos-editable"); if (!editable) return; const current = editable.innerHTML.trim(); if (current && !current.includes("Start writing here")) return; editable.innerHTML = `<p><strong>${escapeHtml(name)}</strong></p><p>IndiCare AI prompt: review recent records, child voice, adult response and outcomes for this section.</p><p>${escapeHtml(evidenceText || "No linked evidence yet. Add recent records to strengthen this document.")}</p><p><em>Adult to review, edit and approve.</em></p>`; }); await saveDocumentFromProcessor(ctx, documentName, category, "ai_improved"); toast("IndiCare AI drafted section prompts from available evidence. Adults must review and edit."); }
function insertEvidence(evidence) { const active = document.querySelector(".docos-edit-section .docos-editable"); if (!active) return; active.insertAdjacentHTML("beforeend", evidence.length ? evidence.slice(0, 5).map((item) => `<p><strong>Evidence:</strong> ${escapeHtml(item.title)} — ${escapeHtml(item.summary)}</p>`).join("") : `<p><strong>Evidence:</strong> No linked records available yet.</p>`); toast("Evidence inserted into the document."); }
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
