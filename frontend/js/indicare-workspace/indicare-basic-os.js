const BASIC_DOCS_STORAGE_KEY = "indicare.basic.docs.v1";

const fallbackTemplates = [
  {
    id: "daily-lived-experience",
    title: "Daily Lived Experience Record",
    category: "Daily care",
    purpose: "Capture the child’s day as lived experience, not just tasks completed.",
    sections: [
      { id: "summary", title: "What happened today?", prompt: "Describe the child’s day in plain, respectful language." },
      { id: "voice", title: "Child voice", prompt: "What did the child say, show, refuse, ask for or communicate?" },
      { id: "wellbeing", title: "Emotional wellbeing", prompt: "Record mood, regulation, relationships and what helped." },
      { id: "actions", title: "Outcome and next actions", prompt: "What needs to happen next and who is responsible?" },
    ],
  },
  {
    id: "incident-behaviour-communication",
    title: "Incident / Behaviour as Communication",
    category: "Incidents",
    purpose: "Record what happened, what it may mean, adult response and learning.",
    sections: [
      { id: "facts", title: "What happened?", prompt: "Record the factual sequence, people present, location, time and immediate action." },
      { id: "meaning", title: "What may behaviour have communicated?", prompt: "Consider emotional need, trigger, transition, anxiety, shame or overwhelm." },
      { id: "response", title: "Adult response", prompt: "Record de-escalation, repair, boundaries, safeguarding and support." },
      { id: "learning", title: "Learning and plan update", prompt: "What needs updating in plans, risk assessment or direct work?" },
    ],
  },
  {
    id: "safeguarding-concern",
    title: "Safeguarding Concern Record",
    category: "Safeguarding",
    purpose: "Record concern, protection, notifications, child voice and follow-up.",
    sections: [
      { id: "concern", title: "Concern identified", prompt: "What was seen, heard, disclosed or suspected?" },
      { id: "action", title: "Immediate protective action", prompt: "What action was taken immediately to keep the child safe?" },
      { id: "notifications", title: "Notifications", prompt: "Who was informed and when?" },
      { id: "plan", title: "Safety plan and review", prompt: "What safety planning or review is needed?" },
    ],
  },
  {
    id: "missing-from-care",
    title: "Missing From Care Report",
    category: "Safeguarding",
    purpose: "Record missing episode, return conversation, risks and learning.",
    sections: [
      { id: "episode", title: "Episode details", prompt: "Time missing, last seen, clothing, location, known risks and immediate action." },
      { id: "return", title: "Return-home conversation", prompt: "What did the child say happened and what support did they need?" },
      { id: "risk", title: "Risk and vulnerability", prompt: "Record exploitation, peers, locations, online contact or family pressure." },
      { id: "plan", title: "Plan update", prompt: "What needs changing in risk assessment, direct work or safety planning?" },
    ],
  },
  {
    id: "direct-work-session",
    title: "Direct Work Session Note",
    category: "Direct work",
    purpose: "Record purposeful therapeutic work, child voice, learning and next steps.",
    sections: [
      { id: "purpose", title: "Purpose of session", prompt: "Why was the session completed and what plan does it link to?" },
      { id: "engagement", title: "Engagement and child voice", prompt: "How did the child engage and what did they say or show?" },
      { id: "learning", title: "What was learned?", prompt: "What did adults learn about the child’s needs, strengths or risks?" },
      { id: "next", title: "Next steps", prompt: "What should happen next and when?" },
    ],
  },
  {
    id: "behaviour-support-plan",
    title: "Behaviour Support Plan",
    category: "Plans",
    purpose: "Create a therapeutic support plan that understands behaviour as communication.",
    sections: [
      { id: "presentation", title: "How the child may present", prompt: "Early signs, escalation signs, emotional cues and communication style." },
      { id: "meaning", title: "What behaviour may communicate", prompt: "Likely emotional meaning, unmet needs, triggers or relationship stress." },
      { id: "support", title: "What helps", prompt: "Relational approaches, routines, trusted adults, reassurance and co-regulation." },
      { id: "repair", title: "Repair and recovery", prompt: "How adults reconnect, reflect and restore safety after incidents." },
    ],
  },
];

let state = {
  view: "dashboard",
  activeTemplateId: null,
  activeDocumentId: null,
};

bootBasicOS();

function bootBasicOS() {
  document.body.className = "basic-os-body";
  document.body.innerHTML = `
    <div class="basic-os">
      <aside class="basic-sidebar">
        <div class="basic-brand"><div class="basic-logo">IC</div><div><strong>IndiCare</strong><span>Children's Home OS</span></div></div>
        <nav class="basic-nav" id="basic-nav">
          <button class="active" data-view="dashboard">Dashboard</button>
          <button data-view="children">Children</button>
          <button data-view="homes">Homes</button>
          <button data-view="documents">IndiCare Docs</button>
          <button data-view="reviews">For Review</button>
          <button data-view="safeguarding">Safeguarding</button>
          <button data-view="chronology">Chronology</button>
        </nav>
      </aside>
      <main class="basic-main">
        <header class="basic-topbar">
          <div><h1 id="basic-title">Dashboard</h1><p id="basic-subtitle">Basic operating shell for residential children’s homes.</p></div>
          <div class="basic-actions"><button class="basic-button" data-view="documents">Open Docs</button><button class="basic-button primary" data-new-document>New Document</button></div>
        </header>
        <section class="basic-content" id="basic-content"></section>
      </main>
    </div>`;
  document.addEventListener("click", handleClick);
  render();
}

function handleClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    state.view = viewButton.dataset.view;
    state.activeTemplateId = null;
    state.activeDocumentId = null;
    render();
  }
  const newDocumentButton = event.target.closest("[data-new-document]");
  if (newDocumentButton) openTemplate(getTemplates()[0].id);
  const templateButton = event.target.closest("[data-template-id]");
  if (templateButton) openTemplate(templateButton.dataset.templateId);
  const openDocumentButton = event.target.closest("[data-open-document-id]");
  if (openDocumentButton) openDocument(openDocumentButton.dataset.openDocumentId);
  const saveDraftButton = event.target.closest("[data-save-draft]");
  if (saveDraftButton) saveActiveDocument("draft");
  const submitButton = event.target.closest("[data-submit-document]");
  if (submitButton) saveActiveDocument("submitted_for_review");
  const approveButton = event.target.closest("[data-approve-document]");
  if (approveButton) updateDocumentStatus(approveButton.dataset.approveDocument, "approved");
}

function render() {
  document.querySelectorAll(".basic-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  if (state.view === "documents") return renderDocumentsLibrary();
  if (state.view === "reviews") return renderReviews();
  if (state.view === "dashboard") return renderDashboard();
  if (state.view === "chronology") return renderChronology();
  if (state.view === "safeguarding") return renderSafeguarding();
  return renderPlaceholder(state.view);
}

function renderDashboard() {
  setHeader("Dashboard", "Today’s operational overview for the home.");
  const docs = getDocuments();
  content().innerHTML = `
    <section class="basic-grid">
      ${metricCard("Children", "3", "Active young people in placement")}
      ${metricCard("Draft documents", docs.filter((doc) => doc.status === "draft").length, "Documents being written")}
      ${metricCard("For review", docs.filter((doc) => doc.status === "submitted_for_review").length, "Awaiting manager review")}
      ${metricCard("Safeguarding", "1", "Open low-level concern")}
    </section>
    <section class="basic-section-title"><h2>Recent documents</h2><button class="basic-button primary" data-view="documents">Open IndiCare Docs</button></section>
    ${documentsTable(docs.slice(0, 6))}`;
}

function renderDocumentsLibrary() {
  setHeader("IndiCare Docs", "Open a full-page template, write, save draft, and submit for review.");
  const templates = getTemplates();
  const docs = getDocuments();
  content().innerHTML = `
    <section class="notice"><strong>Priority workflow:</strong> choose a template → write the record → save draft → submit for manager review.</section>
    <section class="docs-layout">
      <aside class="basic-card"><h3>Templates</h3><p>Select a document to open the full-page Docs editor.</p><div class="template-list">${templates.map(templateCard).join("")}</div></aside>
      <section><div class="basic-section-title"><h2>Document library</h2><button class="basic-button primary" data-new-document>New Document</button></div>${documentsTable(docs)}</section>
    </section>`;
}

function renderReviews() {
  setHeader("For Review", "Manager review queue for submitted documents.");
  const docs = getDocuments().filter((doc) => doc.status === "submitted_for_review");
  content().innerHTML = docs.length ? documentsTable(docs, true) : `<section class="basic-card"><h3>No documents awaiting review</h3><p>Submitted documents will appear here.</p></section>`;
}

function renderChronology() {
  setHeader("Chronology", "Basic chronology linked to saved and submitted documents.");
  const docs = getDocuments();
  content().innerHTML = `<table class="basic-table"><thead><tr><th>Date</th><th>Child</th><th>Entry</th><th>Status</th></tr></thead><tbody>${docs.map((doc) => `<tr><td>${formatDate(doc.updatedAt)}</td><td>${escapeHtml(doc.childName)}</td><td>${escapeHtml(doc.title)} saved in IndiCare Docs</td><td>${statusPill(doc.status)}</td></tr>`).join("")}</tbody></table>`;
}

function renderSafeguarding() {
  setHeader("Safeguarding", "Basic safeguarding overview and document links.");
  const docs = getDocuments().filter((doc) => /safeguarding|missing|incident/i.test(doc.templateId));
  content().innerHTML = `<section class="basic-grid"><div class="basic-card"><h3>Open concerns</h3><strong class="metric">1</strong><p>Low level monitoring.</p></div><div class="basic-card"><h3>Missing episodes</h3><strong class="metric">0</strong><p>No active missing episode.</p></div><div class="basic-card"><h3>Incidents this week</h3><strong class="metric">2</strong><p>Review behaviour support plans.</p></div><div class="basic-card"><h3>Actions due</h3><strong class="metric">1</strong><p>Manager follow-up required.</p></div></section>${documentsTable(docs)}`;
}

function renderPlaceholder(view) {
  const label = titleCase(view);
  setHeader(label, `${label} workspace placeholder. Core documents workflow is prioritised first.`);
  content().innerHTML = `<section class="basic-card"><h3>${label}</h3><p>This area is intentionally basic for now. We are prioritising the end-to-end Docs OS workflow first.</p></section>`;
}

function openTemplate(templateId) {
  const template = getTemplate(templateId);
  const documentId = `doc_${Date.now().toString(36)}`;
  const doc = {
    id: documentId,
    templateId: template.id,
    title: template.title,
    childName: "Jordan A.",
    homeName: "Riverdale House",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: Object.fromEntries((template.sections || []).map((section) => [section.id, ""])),
  };
  const docs = [doc, ...getDocuments()];
  setDocuments(docs);
  state.view = "document-editor";
  state.activeDocumentId = documentId;
  renderDocumentEditor(doc);
}

function openDocument(documentId) {
  const doc = getDocuments().find((item) => item.id === documentId);
  if (!doc) return;
  state.view = "document-editor";
  state.activeDocumentId = documentId;
  renderDocumentEditor(doc);
}

function renderDocumentEditor(doc) {
  const template = getTemplate(doc.templateId);
  setHeader("IndiCare Docs", `${doc.title} · ${doc.childName} · ${doc.homeName}`);
  content().innerHTML = `
    <section class="editor-shell">
      <header class="editor-header">
        <div><h2>${escapeHtml(doc.title)}</h2><p>${escapeHtml(doc.childName)} · ${escapeHtml(doc.homeName)} · ${statusPill(doc.status)} · Last saved ${formatDate(doc.updatedAt)}</p></div>
        <button class="basic-button" data-view="documents">Back to library</button>
      </header>
      <div class="editor-body">
        ${(template.sections || []).map((section) => `
          <section class="editor-section">
            <label for="section-${escapeHtml(section.id)}">${escapeHtml(section.title)}</label>
            <small>${escapeHtml(section.prompt)}</small>
            <textarea id="section-${escapeHtml(section.id)}" data-section-id="${escapeHtml(section.id)}" placeholder="Write here...">${escapeHtml(doc.content?.[section.id] || "")}</textarea>
          </section>`).join("")}
      </div>
      <footer class="editor-footer">
        <button class="basic-button" data-save-draft>Save Draft</button>
        <button class="basic-button primary" data-submit-document>Submit for Review</button>
      </footer>
    </section>`;
}

function saveActiveDocument(status) {
  const docId = state.activeDocumentId;
  const docs = getDocuments();
  const index = docs.findIndex((doc) => doc.id === docId);
  if (index === -1) return;
  const textareas = [...document.querySelectorAll("[data-section-id]")];
  docs[index] = {
    ...docs[index],
    status,
    updatedAt: new Date().toISOString(),
    content: Object.fromEntries(textareas.map((textarea) => [textarea.dataset.sectionId, textarea.value])),
  };
  setDocuments(docs);
  publishDocumentEvent(status, docs[index]);
  renderDocumentEditor(docs[index]);
}

function updateDocumentStatus(documentId, status) {
  const docs = getDocuments();
  const index = docs.findIndex((doc) => doc.id === documentId);
  if (index === -1) return;
  docs[index] = { ...docs[index], status, updatedAt: new Date().toISOString() };
  setDocuments(docs);
  publishDocumentEvent(status, docs[index]);
  renderReviews();
}

function publishDocumentEvent(status, doc) {
  window.IndiCareEventBus?.publish?.(`document.${status}`, { documentId: doc.id, title: doc.title, childName: doc.childName, homeName: doc.homeName }, { source: "indicare-basic-os", scope: "document" });
}

function getTemplates() {
  return window.IndiCareDocTemplates?.all?.() || fallbackTemplates;
}

function getTemplate(templateId) {
  return window.IndiCareDocTemplates?.get?.(templateId) || getTemplates().find((template) => template.id === templateId) || fallbackTemplates[0];
}

function getDocuments() {
  try {
    const docs = JSON.parse(localStorage.getItem(BASIC_DOCS_STORAGE_KEY) || "[]");
    return Array.isArray(docs) ? docs : [];
  } catch {
    return [];
  }
}

function setDocuments(docs) {
  localStorage.setItem(BASIC_DOCS_STORAGE_KEY, JSON.stringify(docs));
}

function documentsTable(docs, reviewMode = false) {
  if (!docs.length) return `<section class="basic-card"><h3>No documents yet</h3><p>Open a template from IndiCare Docs to create the first record.</p></section>`;
  return `<table class="basic-table"><thead><tr><th>Document</th><th>Child</th><th>Home</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${docs.map((doc) => `<tr><td><strong>${escapeHtml(doc.title)}</strong></td><td>${escapeHtml(doc.childName)}</td><td>${escapeHtml(doc.homeName)}</td><td>${statusPill(doc.status)}</td><td>${formatDate(doc.updatedAt)}</td><td><button class="basic-button" data-open-document-id="${escapeHtml(doc.id)}">Open</button>${reviewMode ? ` <button class="basic-button primary" data-approve-document="${escapeHtml(doc.id)}">Approve</button>` : ""}</td></tr>`).join("")}</tbody></table>`;
}

function templateCard(template) {
  return `<button class="template-item" data-template-id="${escapeHtml(template.id)}"><strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.purpose || template.category || "Open full page document")}</span></button>`;
}

function metricCard(title, value, text) {
  return `<div class="basic-card"><h3>${escapeHtml(title)}</h3><strong class="metric">${escapeHtml(value)}</strong><p>${escapeHtml(text)}</p></div>`;
}

function statusPill(status) {
  const label = String(status || "draft").replaceAll("_", " ");
  const className = status === "submitted_for_review" ? "review" : status === "approved" ? "approved" : "";
  return `<span class="status ${className}">${escapeHtml(titleCase(label))}</span>`;
}

function setHeader(title, subtitle) {
  document.getElementById("basic-title").textContent = title;
  document.getElementById("basic-subtitle").textContent = subtitle;
}

function content() { return document.getElementById("basic-content"); }
function titleCase(value) { return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function formatDate(value) { return value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
