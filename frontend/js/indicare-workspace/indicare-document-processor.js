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
  "Life Story / Identity": ["Who I am", "Culture and identity", "Important people", "Memories", "Achievements", "Wishes and feelings"]
};

const DOCUMENT_STATUSES = ["draft", "ai_improved", "submitted_for_review", "changes_requested", "approved", "archived"];

bootIndiCareDocumentProcessor();

function bootIndiCareDocumentProcessor() {
  if (window.IndiCareDocumentProcessor) return;
  window.IndiCareDocumentProcessor = {
    open: openDocumentProcessor,
    close: closeDocumentProcessor,
  };
}

async function openDocumentProcessor(options = {}) {
  const ctx = context();
  const documentName = options.name || options.title || "Placement Plan";
  const category = options.category || "Child document";
  const sections = options.sections || DEFAULT_SECTIONS[documentName] || ["Overview", "Needs", "Risks", "Actions", "Review notes"];
  const records = await fetchRecords(ctx.childId);
  const evidence = buildEvidence(records, documentName);
  const documentState = loadLocalDocument(ctx.childId, documentName, sections);

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
    <div class="docos-shell">
      <header class="docos-header">
        <div class="docos-title-block">
          <p class="eyebrow">IndiCare Documents</p>
          <h2>${escapeHtml(documentName)}</h2>
          <p>${escapeHtml(category)} • ${escapeHtml(ctx.childName || "Selected child")} • live editable child document</p>
        </div>
        <div class="docos-header-actions">
          <button type="button" class="secondary-action" data-doc-action="versions">Versions</button>
          <button type="button" class="secondary-action" data-doc-action="submit">Submit for review</button>
          <button type="button" class="primary-action" data-doc-action="save">Save</button>
          <button type="button" class="icon-button" data-doc-action="close" aria-label="Close document">×</button>
        </div>
      </header>

      <div class="docos-body">
        <aside class="docos-left-rail">
          <div class="docos-child-card">
            <div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div>
            <div><strong>${escapeHtml(ctx.childName || "Selected child")}</strong><span>${escapeHtml(ctx.homeName || "Selected home")}</span></div>
          </div>
          <nav class="docos-section-nav">
            ${sections.map((section, index) => `<button type="button" class="docos-section-link ${index === 0 ? "active" : ""}" data-section-target="section-${index}">${escapeHtml(section)}</button>`).join("")}
          </nav>
          <div class="docos-status-card">
            <span>Status</span>
            <strong id="docos-status-label">${escapeHtml(humanise(documentState.status))}</strong>
            ${lifecycleStrip(documentState.status)}
          </div>
        </aside>

        <main class="docos-editor" id="docos-editor">
          <div class="docos-paper">
            <div class="docos-paper-header">
              <p class="eyebrow">Live document</p>
              <h1 contenteditable="true" data-doc-title>${escapeHtml(documentState.title || documentName)}</h1>
              <p contenteditable="true" data-doc-subtitle>${escapeHtml(documentState.subtitle || `Working document for ${ctx.childName || "selected child"}.`)}</p>
            </div>
            ${sections.map((section, index) => renderEditableSection(section, index, documentState.sections?.[section])).join("")}
          </div>
        </main>

        <aside class="docos-right-rail">
          <section class="docos-ai-card">
            <p class="eyebrow">IndiCare AI</p>
            <h3>Document intelligence</h3>
            <p>Use records, chronology and child voice to improve this document.</p>
            <button type="button" class="primary-action" data-doc-action="ai-improve">Improve document</button>
            <button type="button" class="secondary-action" data-doc-action="evidence">Insert evidence</button>
          </section>

          <section class="docos-panel">
            <p class="eyebrow">Evidence from records</p>
            <h3>Linked evidence</h3>
            <div id="docos-evidence-list">
              ${evidence.length ? evidence.map(renderEvidence).join("") : `<div class="empty-state">No linked evidence found yet. New records will appear here.</div>`}
            </div>
          </section>

          <section class="docos-panel">
            <p class="eyebrow">Comments</p>
            <h3>Review comments</h3>
            <div id="docos-comments">${(documentState.comments || []).map((comment) => `<div class="alert low"><p>${escapeHtml(comment)}</p></div>`).join("") || `<div class="empty-state">No comments yet.</div>`}</div>
            <textarea id="docos-comment-input" placeholder="Add manager comment, requested change or review note..."></textarea>
            <button type="button" class="secondary-action" data-doc-action="comment">Add comment</button>
          </section>
        </aside>
      </div>
    </div>
  `;

  bindProcessorActions(modal, ctx, documentName, sections, evidence);
  modal.classList.add("open");
  document.body.classList.add("document-processor-open");
}

function bindProcessorActions(modal, ctx, documentName, sections, evidence) {
  modal.querySelector("[data-doc-action='close']")?.addEventListener("click", closeDocumentProcessor);
  modal.querySelector("[data-doc-action='save']")?.addEventListener("click", () => saveDocumentFromProcessor(ctx.childId, documentName, "draft"));
  modal.querySelector("[data-doc-action='submit']")?.addEventListener("click", () => saveDocumentFromProcessor(ctx.childId, documentName, "submitted_for_review"));
  modal.querySelector("[data-doc-action='ai-improve']")?.addEventListener("click", () => improveDocument(sections, evidence));
  modal.querySelector("[data-doc-action='evidence']")?.addEventListener("click", () => insertEvidence(evidence));
  modal.querySelector("[data-doc-action='comment']")?.addEventListener("click", () => addComment(ctx.childId, documentName));
  modal.querySelector("[data-doc-action='versions']")?.addEventListener("click", () => showVersions(ctx.childId, documentName));
  modal.querySelectorAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => {
      modal.querySelectorAll(".docos-section-link").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      modal.querySelector(`#${button.dataset.sectionTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderEditableSection(section, index, value = "") {
  return `
    <section class="docos-edit-section" id="section-${index}" data-doc-section="${escapeHtml(section)}">
      <div class="docos-section-heading">
        <p class="eyebrow">Section ${index + 1}</p>
        <h2>${escapeHtml(section)}</h2>
      </div>
      <div class="docos-editable" contenteditable="true" data-placeholder="Write ${escapeHtml(section.toLowerCase())} here...">${value ? escapeHtml(value) : defaultSectionText(section)}</div>
    </section>
  `;
}

function defaultSectionText(section) {
  return `<p><strong>${escapeHtml(section)}</strong></p><p>Start writing here. Use IndiCare AI to pull evidence from records, child voice, adult response, safeguarding and outcomes.</p>`;
}

function saveDocumentFromProcessor(childId, name, status = "draft") {
  const title = document.querySelector("[data-doc-title]")?.innerText || name;
  const subtitle = document.querySelector("[data-doc-subtitle]")?.innerText || "";
  const sections = {};
  document.querySelectorAll("[data-doc-section]").forEach((section) => {
    sections[section.dataset.docSection] = section.querySelector(".docos-editable")?.innerHTML || "";
  });
  const key = storageKey(childId, name);
  const existing = loadLocalDocument(childId, name, Object.keys(sections));
  const versions = existing.versions || [];
  versions.unshift({ saved_at: new Date().toISOString(), status: existing.status || "draft", title: existing.title || name, sections: existing.sections || {} });
  const state = { ...existing, title, subtitle, sections, status, updated_at: new Date().toISOString(), versions: versions.slice(0, 25) };
  localStorage.setItem(key, JSON.stringify(state));
  const statusLabel = document.getElementById("docos-status-label");
  if (statusLabel) statusLabel.textContent = humanise(status);
  toast(`Document ${status === "submitted_for_review" ? "submitted for review" : "saved"}.`);
}

function improveDocument(sections, evidence) {
  const evidenceText = evidence.slice(0, 4).map((item) => `${item.title}: ${item.summary}`).join("\n");
  document.querySelectorAll("[data-doc-section]").forEach((section) => {
    const name = section.dataset.docSection;
    const editable = section.querySelector(".docos-editable");
    if (!editable) return;
    const current = editable.innerHTML.trim();
    if (current && !current.includes("Start writing here")) return;
    editable.innerHTML = `<p><strong>${escapeHtml(name)}</strong></p><p>IndiCare AI prompt: review recent records, child voice, adult response and outcomes for this section.</p><p>${escapeHtml(evidenceText || "No linked evidence yet. Add recent records to strengthen this document.")}</p><p><em>Adult to review, edit and approve.</em></p>`;
  });
  saveDocumentFromProcessor(context().childId, document.querySelector("[data-doc-title]")?.innerText || "Document", "ai_improved");
  toast("IndiCare AI drafted section prompts from available evidence. Adults must review and edit.");
}

function insertEvidence(evidence) {
  const active = document.querySelector(".docos-edit-section .docos-editable");
  if (!active) return;
  const html = evidence.length ? evidence.slice(0, 5).map((item) => `<p><strong>Evidence:</strong> ${escapeHtml(item.title)} — ${escapeHtml(item.summary)}</p>`).join("") : `<p><strong>Evidence:</strong> No linked records available yet.</p>`;
  active.insertAdjacentHTML("beforeend", html);
  toast("Evidence inserted into the document.");
}

function addComment(childId, name) {
  const input = document.getElementById("docos-comment-input");
  const value = input?.value?.trim();
  if (!value) return;
  const existing = loadLocalDocument(childId, name, []);
  existing.comments = existing.comments || [];
  existing.comments.unshift(value);
  localStorage.setItem(storageKey(childId, name), JSON.stringify(existing));
  const comments = document.getElementById("docos-comments");
  if (comments) comments.innerHTML = existing.comments.map((comment) => `<div class="alert low"><p>${escapeHtml(comment)}</p></div>`).join("");
  input.value = "";
  toast("Comment added.");
}

function showVersions(childId, name) {
  const existing = loadLocalDocument(childId, name, []);
  const panel = document.getElementById("docos-evidence-list");
  if (!panel) return;
  panel.innerHTML = (existing.versions || []).length
    ? existing.versions.map((version) => `<div class="alert low"><strong>${escapeHtml(humanise(version.status))}</strong><p>${escapeHtml(version.saved_at)}</p></div>`).join("")
    : `<div class="empty-state">No saved versions yet.</div>`;
}

function closeDocumentProcessor() {
  document.getElementById("indicare-document-processor")?.classList.remove("open");
  document.body.classList.remove("document-processor-open");
}

function loadLocalDocument(childId, name, sections) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(childId, name)) || "null");
    if (stored) return stored;
  } catch {}
  return { title: name, subtitle: "", sections: Object.fromEntries(sections.map((section) => [section, ""])), comments: [], versions: [], status: "draft" };
}

function storageKey(childId, name) { return `indicare-document:${childId || "no-child"}:${name}`; }

function buildEvidence(records, documentName) {
  const terms = documentName.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  return records
    .filter((record) => terms.some((term) => record.text.includes(term)) || documentEvidenceFallback(record, documentName))
    .slice(0, 10)
    .map((record) => ({ title: record.title || humanise(record.type), summary: record.summary || record.content?.what_happened || record.content?.outcome || "Linked child record", type: record.type, status: record.status }));
}

function documentEvidenceFallback(record, name) {
  const text = record.text || "";
  if (/risk|behaviour|missing|safeguarding/i.test(name)) return /risk|incident|missing|safeguarding|police|harm|trigger|de-escalation/i.test(text);
  if (/education|personal education/i.test(name)) return /school|education|teacher|attendance|learning/i.test(text);
  if (/health/i.test(name)) return /health|camhs|medication|sleep|diet|doctor|dentist/i.test(text);
  if (/communication|sensory/i.test(name)) return /voice|communicat|sensory|overwhelm|regulation|noise|light/i.test(text);
  return /outcome|progress|voice|actions|review/i.test(text);
}

async function fetchRecords(childId) {
  if (!childId) return [];
  const types = ["daily", "incident", "safeguarding", "missing"];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&include_archived=true&limit=100`, { credentials: "include" });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => normaliseRecord(record, type)));
    } catch {}
  }
  return all;
}

function normaliseRecord(record, type) {
  const content = record.content || {};
  const text = `${record.title || ""} ${record.summary || ""} ${Object.values(content).join(" ")}`.toLowerCase();
  return { ...record, type: record.record_type || type, content, text };
}
function renderEvidence(item) { return `<div class="docos-evidence-item"><span>${escapeHtml(humanise(item.type))}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(humanise(item.status || "draft"))}</small></div>`; }
function lifecycleStrip(status) { const current = String(status || "draft").toLowerCase(); return `<div class="record-lifecycle-strip compact">${DOCUMENT_STATUSES.map((step) => `<span class="lifecycle-pill ${step === current ? "active" : ""}">${escapeHtml(humanise(step))}</span>`).join("")}</div>`; }
function context() { return window.IndiCareContext?.get?.() || { childId: "", childName: "Selected child", homeName: "Selected home" }; }
function initials(name) { return String(name || "IC").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function toast(message) { const old = document.getElementById("indicare-toast"); old?.remove(); const el = document.createElement("div"); el.id = "indicare-toast"; el.className = "indicare-toast"; el.textContent = message; document.body.appendChild(el); setTimeout(() => el.remove(), 4200); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
