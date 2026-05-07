const DOCS_KEY = "indicare.basic.docs.v1";

const childrenSeed = [
  { id: "child_jordan", name: "Jordan A.", age: 15, home: "Riverdale House", status: "Stable", keyWorker: "Sarah M.", risk: "Low", docsDue: 1, nextReview: "28 May 2025" },
  { id: "child_tyler", name: "Tyler S.", age: 14, home: "Riverdale House", status: "Watchful", keyWorker: "Mark P.", risk: "Medium", docsDue: 2, nextReview: "30 May 2025" },
  { id: "child_casey", name: "Casey L.", age: 16, home: "Riverdale House", status: "Settled", keyWorker: "Amina R.", risk: "Low", docsDue: 1, nextReview: "02 Jun 2025" },
];

const recentDocsSeed = [
  ["seed_daily_jordan", "daily-lived-experience", "Daily Lived Experience Record", "Jordan A.", "Daily Record", "Draft", "20 May 2025 10:15"],
  ["seed_incident_tyler", "incident-behaviour-communication", "Incident Record", "Tyler S.", "Incident", "Under Review", "20 May 2025 09:47"],
  ["seed_direct_jordan", "direct-work-session", "Direct Work Record", "Jordan A.", "Direct Work", "Approved", "19 May 2025 16:30"],
  ["seed_safeguarding_casey", "safeguarding-concern", "Safeguarding Concern", "Casey L.", "Safeguarding", "Under Review", "19 May 2025 14:22"],
  ["seed_missing_tyler", "missing-from-care", "Missing From Care Report", "Tyler S.", "Missing From Care", "Draft", "19 May 2025 11:05"],
];

bootSharePointShell();

function bootSharePointShell() {
  document.body.className = "sharepoint-os-body";
  document.body.innerHTML = `
    <div class="sp-os-shell">
      <aside class="sp-sidebar">
        <div class="sp-brand"><div class="sp-logo">IC</div><div><strong>IndiCare OS</strong><span>Children's Home Operating System</span></div></div>
        <nav class="sp-nav">
          ${navButton("Dashboard", "dashboard", true)}${navButton("Children", "children")}${navButton("Homes", "homes")}${navButton("IndiCare Docs", "docs")}${navButton("Chronology", "chronology")}${navButton("Safeguarding", "safeguarding")}${navButton("Reviews", "reviews")}${navButton("Workforce", "workforce")}${navButton("Reports", "reports")}${navButton("Settings", "settings")}
        </nav>
        <button class="sp-collapse">‹ Collapse</button>
      </aside>
      <section class="sp-app">
        <header class="sp-topbar"><button class="sp-menu" aria-label="Open menu">☰</button><div class="sp-search"><input placeholder="Search children, documents, records..." /><span>⌕</span></div><div class="sp-top-actions"><button class="sp-icon-btn">🔔<b>3</b></button><button class="sp-home-chip">⌂ Riverdale House⌄</button><div class="sp-user"><span>SM</span><div><strong>Sarah M.</strong><small>Key Worker</small></div><i>⌄</i></div></div></header>
        <main class="sp-main" id="sp-main"></main>
      </section>
    </div>
    <section class="sp-ai-bubble"><div><strong>IndiCare AI</strong><span>How can I help you today?</span></div><button>⌃</button><label><input placeholder="Ask IndiCare AI..." /><em>➤</em></label></section>`;
  document.addEventListener("click", handleShellClick);
  document.addEventListener("input", handleShellInput);
  renderDashboard();
}

function handleShellClick(event) {
  const nav = event.target.closest("[data-sp-view]");
  if (nav) {
    setActiveNav(nav.dataset.spView);
    renderView(nav.dataset.spView);
  }
  const openDoc = event.target.closest("[data-open-doc]");
  if (openDoc) renderDocsView();
  const childButton = event.target.closest("[data-child-id]");
  if (childButton) renderChildProfile(childButton.dataset.childId);
  const childDocsButton = event.target.closest("[data-child-docs]");
  if (childDocsButton) renderDocsView(childDocsButton.dataset.childDocs);
  const childChronologyButton = event.target.closest("[data-child-chronology]");
  if (childChronologyButton) renderChronologyView(childChronologyButton.dataset.childChronology);
  const templateButton = event.target.closest("[data-template-id]");
  if (templateButton) createDocumentFromTemplate(templateButton.dataset.templateId);
  const newTemplateButton = event.target.closest("[data-new-template]");
  if (newTemplateButton) createDocumentFromTemplate(newTemplateButton.dataset.newTemplate || "daily-lived-experience");
  const openDocumentButton = event.target.closest("[data-open-document-id]");
  if (openDocumentButton) openDocument(openDocumentButton.dataset.openDocumentId);
  const saveButton = event.target.closest("[data-save-doc]");
  if (saveButton) saveDocument("draft");
  const submitButton = event.target.closest("[data-submit-doc]");
  if (submitButton) saveDocument("submitted_for_review");
  const approveButton = event.target.closest("[data-approve-doc]");
  if (approveButton) updateDocumentStatus(approveButton.dataset.approveDoc, "approved");
}

function handleShellInput(event) {
  const textarea = event.target.closest("[data-doc-section]");
  if (!textarea) return;
  const doc = activeDocument();
  if (!doc) return;
  doc.content = doc.content || {};
  doc.content[textarea.dataset.docSection] = textarea.value;
  upsertDocument({ ...doc, updatedAt: new Date().toISOString(), autosaved: true });
  const autosave = document.querySelector("[data-autosave-state]");
  if (autosave) autosave.textContent = "Autosaved just now";
}

function renderView(view) {
  if (view === "dashboard") return renderDashboard();
  if (view === "children") return renderChildrenView();
  if (view === "docs") return renderDocsView();
  if (view === "reviews") return renderReviewsView();
  if (view === "chronology") return renderChronologyView();
  if (view === "safeguarding") return renderSafeguardingView();
  const title = titleCase(view);
  main().innerHTML = `<section class="sp-page-head"><div><h1>${title}</h1><p>This area is ready for the next build phase.</p></div></section><section class="sp-card"><h2>${title}</h2><p>Basic shell placeholder. IndiCare Docs and operational dashboard are the current priority.</p></section>`;
}

function renderDashboard() {
  const docs = getDocs();
  main().innerHTML = `<section class="sp-page-head"><div><h1>Dashboard</h1><p>Welcome back, Sarah. Here's what's happening at Riverdale House today.</p></div><div class="sp-date">📅 20 May 2025</div></section><section class="sp-dashboard-grid"><section class="sp-left-content"><h2 class="sp-section-title">Today's priorities</h2><div class="sp-priority-grid">${priorityCard("📄", "4", "Documents awaiting review", "View all")}${priorityCard("⚠", "1", "Safeguarding alert", "View all", "amber")}${priorityCard("△", "2", "Missing records identified", "View all", "red")}${priorityCard("📅", "3", "Tasks due today", "View all", "green")}</div><section class="sp-card sp-doc-table-card"><div class="sp-card-head"><h2>Recent documents</h2><button data-open-doc>View all documents →</button></div>${documentsTable(docs.length ? docs : seedDocs())}</section><section class="sp-two-col"><div class="sp-card"><div class="sp-card-head"><h2>Missing records</h2><button>View all →</button></div>${miniRows([["Jordan A.","Weekly Wellbeing Check","Due 19 May 2025"],["Tyler S.","Education Record","Due 18 May 2025"],["Casey L.","Family Contact Record","Due 17 May 2025"]], true)}</div><div class="sp-card"><div class="sp-card-head"><h2>Upcoming reviews</h2><button>View all →</button></div>${miniRows([["Jordan A.","Care Plan Review","28 May 2025"],["Tyler S.","Risk Assessment","30 May 2025"],["Casey L.","Placement Review","02 Jun 2025"]])}</div></section></section><aside class="sp-right-content">${safeguardingPanel()}${chronologyPanel()}</aside></section>`;
}

function renderChildrenView() {
  setActiveNav("children");
  main().innerHTML = `<section class="sp-page-head"><div><h1>Children</h1><p>Young people currently living at Riverdale House.</p></div><button class="sp-primary" data-sp-view="docs">Create record</button></section><section class="sp-children-grid">${childrenSeed.map(childCard).join("")}</section><section class="sp-card"><div class="sp-card-head"><h2>Children document overview</h2><button data-open-doc>Open IndiCare Docs →</button></div>${documentsTable(getDocs().length ? getDocs() : seedDocs())}</section>`;
}

function childCard(child) {
  return `<article class="sp-child-card"><div class="sp-child-avatar">${escapeHtml(child.name.split(" ").map((part) => part[0]).join(""))}</div><div><h2>${escapeHtml(child.name)}</h2><p>Age ${escapeHtml(child.age)} · ${escapeHtml(child.home)}</p></div><span class="sp-status ${child.risk === "Medium" ? "submitted-for-review" : "approved"}">${escapeHtml(child.risk)} risk</span><dl><div><dt>Status</dt><dd>${escapeHtml(child.status)}</dd></div><div><dt>Key worker</dt><dd>${escapeHtml(child.keyWorker)}</dd></div><div><dt>Docs due</dt><dd>${escapeHtml(child.docsDue)}</dd></div><div><dt>Next review</dt><dd>${escapeHtml(child.nextReview)}</dd></div></dl><footer><button class="sp-open-btn" data-child-id="${escapeHtml(child.id)}">Open profile</button><button class="sp-open-btn" data-child-docs="${escapeHtml(child.name)}">Docs</button><button class="sp-open-btn" data-child-chronology="${escapeHtml(child.name)}">Chronology</button></footer></article>`;
}

function renderChildProfile(childId) {
  const child = childrenSeed.find((item) => item.id === childId) || childrenSeed[0];
  const docs = [...getDocs(), ...seedDocs()].filter((doc) => doc.childName === child.name);
  main().innerHTML = `<section class="sp-page-head"><div><button class="sp-back" data-sp-view="children">‹ Back to children</button><h1>${escapeHtml(child.name)}</h1><p>Age ${escapeHtml(child.age)} · ${escapeHtml(child.home)} · Key worker: ${escapeHtml(child.keyWorker)}</p></div><button class="sp-primary" data-new-template="daily-lived-experience">New daily record</button></section><section class="sp-dashboard-grid"><section class="sp-left-content"><div class="sp-priority-grid">${priorityCard("✓", child.status, "Current placement state", "View plan", "green")}${priorityCard("⚠", child.risk, "Current risk level", "Open safeguarding", child.risk === "Medium" ? "amber" : "green")}${priorityCard("📄", String(child.docsDue), "Documents due", "Open Docs")}${priorityCard("📅", child.nextReview, "Next review", "View calendar", "blue")}</div><section class="sp-card"><div class="sp-card-head"><h2>${escapeHtml(child.name)} documents</h2><button data-child-docs="${escapeHtml(child.name)}">Open all docs →</button></div>${documentsTable(docs.length ? docs : seedDocs().filter((doc) => doc.childName === child.name))}</section></section><aside class="sp-right-content"><section class="sp-card"><h2>Quick actions</h2><div class="sp-template-list"><button class="sp-template" data-new-template="daily-lived-experience"><strong>Daily record</strong><span>Create today’s lived experience record.</span></button><button class="sp-template" data-new-template="direct-work-session"><strong>Direct work</strong><span>Record key work or therapeutic session.</span></button><button class="sp-template" data-new-template="safeguarding-concern"><strong>Safeguarding concern</strong><span>Record and escalate a concern.</span></button></div></section>${chronologyPanel()}</aside></section>`;
}

function renderDocsView(childName = null) {
  setActiveNav("docs");
  const docs = childName ? [...getDocs(), ...seedDocs()].filter((doc) => doc.childName === childName) : getDocs();
  const templates = getTemplates();
  main().innerHTML = `<section class="sp-page-head"><div><h1>IndiCare Docs</h1><p>${childName ? `${escapeHtml(childName)} documents` : "Open templates, write records, save drafts and submit for review."}</p></div><button class="sp-primary" data-new-template="daily-lived-experience">New document</button></section><section class="sp-docs-grid"><section class="sp-card"><h2>Templates</h2><div class="sp-template-list">${templates.map((template) => `<button class="sp-template" data-template-id="${escapeHtml(template.id)}"><strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.purpose || template.category || "Open full-page document")}</span></button>`).join("")}</div></section><section class="sp-card"><div class="sp-card-head"><h2>Document library</h2><button>View archived</button></div>${documentsTable(docs.length ? docs : seedDocs())}</section></section>`;
}

function createDocumentFromTemplate(templateId) {
  const template = getTemplate(templateId);
  const doc = { id: `doc_${Date.now().toString(36)}`, title: template.title, templateId: template.id, childName: "Jordan A.", homeName: "Riverdale House", type: template.category || "Record", status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), content: Object.fromEntries((template.sections || []).map((section) => [section.id, ""])) };
  upsertDocument(doc);
  openDocument(doc.id);
}

function openDocument(documentId) {
  let doc = getDocs().find((item) => item.id === documentId);
  if (!doc) doc = seedDocs().find((item) => item.id === documentId);
  if (!doc) return;
  upsertDocument(doc);
  window.__activeIndiCareDocId = documentId;
  renderDocumentEditor(doc);
}

function renderDocumentEditor(doc) {
  setActiveNav("docs");
  const template = getTemplate(doc.templateId);
  const sections = template.sections?.length ? template.sections : [{ id: "main", title: "Record", prompt: "Write the record here." }];
  main().innerHTML = `<section class="sp-doc-fullpage"><header class="sp-doc-top"><div><button class="sp-back" data-sp-view="docs">‹ Back to documents</button><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.childName)} · ${escapeHtml(doc.homeName)} · ${status(doc.status)} · <span data-autosave-state>${doc.autosaved ? "Autosaved" : "Ready"}</span></p></div><div class="sp-doc-actions"><button class="sp-secondary" data-save-doc>Save Draft</button><button class="sp-primary" data-submit-doc>Submit for Review</button></div></header><section class="sp-doc-editor-grid"><article class="sp-doc-paper">${sections.map((section, index) => `<section class="sp-doc-section"><div class="sp-doc-section-number">${index + 1}</div><div><label>${escapeHtml(section.title)}</label><small>${escapeHtml(section.prompt)}</small><textarea data-doc-section="${escapeHtml(section.id)}" placeholder="Write here...">${escapeHtml(doc.content?.[section.id] || "")}</textarea></div></section>`).join("")}</article><aside class="sp-doc-context"><section class="sp-card"><h2>Context</h2><p><strong>Child:</strong> ${escapeHtml(doc.childName)}</p><p><strong>Home:</strong> ${escapeHtml(doc.homeName)}</p><p><strong>Status:</strong> ${status(doc.status)}</p></section><section class="sp-card"><h2>Recent chronology</h2>${chronologyList(doc.childName)}</section><section class="sp-card"><h2>IndiCare guidance</h2><p>Keep the record factual, child-centred and clear. Include child voice, emotional wellbeing, safeguarding concerns and next actions.</p></section></aside></section></section>`;
}

function saveDocument(statusValue) {
  const doc = activeDocument();
  if (!doc) return;
  const textareas = [...document.querySelectorAll("[data-doc-section]")];
  const nextDoc = { ...doc, status: statusValue, updatedAt: new Date().toISOString(), content: Object.fromEntries(textareas.map((textarea) => [textarea.dataset.docSection, textarea.value])) };
  upsertDocument(nextDoc);
  window.IndiCareEventBus?.publish?.(`document.${statusValue}`, { documentId: nextDoc.id, title: nextDoc.title, childName: nextDoc.childName }, { source: "indicare-sharepoint-os", scope: "document" });
  renderDocumentEditor(nextDoc);
}

function renderReviewsView() {
  const docs = getDocs().filter((doc) => doc.status === "submitted_for_review" || doc.status === "Under Review");
  main().innerHTML = `<section class="sp-page-head"><div><h1>Reviews</h1><p>Documents submitted for manager review.</p></div></section><section class="sp-card">${documentsTable(docs.length ? docs : seedDocs().filter((doc) => /review/i.test(doc.status)), true)}</section>`;
}
function renderChronologyView(childName = null) { main().innerHTML = `<section class="sp-page-head"><div><h1>Chronology</h1><p>${childName ? `${escapeHtml(childName)} chronology` : "Basic chronology snapshot for Riverdale House."}</p></div></section><section class="sp-card">${chronologyList(childName)}</section>`; }
function renderSafeguardingView() { main().innerHTML = `<section class="sp-page-head"><div><h1>Safeguarding</h1><p>Open safeguarding alerts and related documents.</p></div></section>${safeguardingPanel()}<section class="sp-card">${documentsTable(seedDocs().filter((doc) => /Safeguarding|Incident|Missing/.test(doc.title)))}</section>`; }

function updateDocumentStatus(documentId, statusValue) { const doc = getDocs().find((item) => item.id === documentId) || seedDocs().find((item) => item.id === documentId); if (!doc) return; upsertDocument({ ...doc, status: statusValue, updatedAt: new Date().toISOString() }); renderReviewsView(); }
function activeDocument() { return getDocs().find((doc) => doc.id === window.__activeIndiCareDocId); }
function upsertDocument(doc) { const docs = getDocs().filter((item) => item.id !== doc.id); docs.unshift(doc); localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); }
function getTemplates() { return window.IndiCareDocTemplates?.all?.() || []; }
function getTemplate(templateId) { return window.IndiCareDocTemplates?.get?.(templateId) || getTemplates().find((template) => template.id === templateId) || { id: "record", title: "Record", sections: [] }; }
function navButton(label, view, active = false) { const icons = { Dashboard: "▦", Children: "♙", Homes: "⌂", "IndiCare Docs": "▤", Chronology: "◴", Safeguarding: "◇", Reviews: "☑", Workforce: "♧", Reports: "▥", Settings: "⚙" }; return `<button class="${active ? "active" : ""}" data-sp-view="${view}"><span>${icons[label] || "•"}</span>${label}</button>`; }
function priorityCard(icon, number, label, link, tone = "blue") { return `<article class="sp-priority ${tone}"><span>${icon}</span><strong>${number}</strong><p>${label}</p><a>${link} →</a></article>`; }
function documentsTable(docs, reviewMode = false) { return `<table class="sp-table"><thead><tr><th>Document</th><th>Child</th><th>Type</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${docs.map((doc) => `<tr><td>${escapeHtml(doc.title || doc[2])}</td><td>${escapeHtml(doc.childName || doc[3])}</td><td>${escapeHtml(doc.type || doc[4])}</td><td>${status(doc.status || doc[5])}</td><td>${escapeHtml(doc.updated || doc[6] || formatDate(doc.updatedAt))}</td><td><button class="sp-open-btn" data-open-document-id="${escapeHtml(doc.id || doc[0])}">Open</button>${reviewMode ? ` <button class="sp-open-btn" data-approve-doc="${escapeHtml(doc.id || doc[0])}">Approve</button>` : ""}<button class="sp-kebab">⋮</button></td></tr>`).join("")}</tbody></table>`; }
function safeguardingPanel() { return `<section class="sp-card"><div class="sp-card-head"><h2>Safeguarding alerts</h2><button>View all →</button></div><article class="sp-alert"><span></span><div><b>Low Risk</b><strong>Safeguarding concern reported for Tyler S.</strong><small>Reported on 20 May 2025</small></div><i>›</i></article></section>`; }
function chronologyPanel() { return `<section class="sp-card"><div class="sp-card-head"><h2>Chronology snapshot</h2><button data-sp-view="chronology">View full chronology →</button></div>${chronologyList()}</section>`; }
function chronologyList(childName = null) { const name = childName || "Jordan A."; return `<div class="sp-timeline"><h3>Today</h3>${timelineItem("10:15", "Daily record submitted", `${name} by Sarah M.`)}${timelineItem("09:30", "School attendance recorded", name)}<h3>Yesterday</h3>${timelineItem("16:45", "Football session completed", name, "amber")}${timelineItem("14:20", "Family call completed", name, "purple")}${timelineItem("09:10", "Medication administered", name)}</div>`; }
function timelineItem(time, title, detail, tone = "blue") { return `<div class="sp-time-item ${tone}"><time>${time}</time><span></span><div><strong>${title}</strong><small>${detail}</small></div></div>`; }
function miniRows(rows, overdue = false) { return `<div class="sp-mini-rows">${rows.map(([a,b,c]) => `<p><span>${a}</span><strong>${b}</strong><em class="${overdue ? "overdue" : ""}">${c}</em></p>`).join("")}</div>`; }
function seedDocs() { return recentDocsSeed.map(([id, templateId, title, childName, type, status, updated]) => ({ id, templateId, title, childName, homeName: "Riverdale House", type, status, updated, updatedAt: updated, content: {} })); }
function getDocs() { try { const docs = JSON.parse(localStorage.getItem(DOCS_KEY) || "[]"); return Array.isArray(docs) ? docs.map((doc) => ({ ...doc, type: doc.type || doc.category || doc.templateId || "Record", updated: doc.updatedAt ? safeDate(doc.updatedAt) : doc.updated || "Today" })) : []; } catch { return []; } }
function status(value) { const key = String(value || "Draft").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-"); const label = titleCase(String(value || "Draft").replaceAll("_", " ")); return `<span class="sp-status ${key}">${escapeHtml(label)}</span>`; }
function setActiveNav(view) { document.querySelectorAll("[data-sp-view]").forEach((button) => button.classList.toggle("active", button.dataset.spView === view)); }
function titleCase(value) { return String(value || "").replace(/\b\w/g, (c) => c.toUpperCase()); }
function safeDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function formatDate(value) { return value ? safeDate(value) : "Today"; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
function main() { return document.getElementById("sp-main"); }
