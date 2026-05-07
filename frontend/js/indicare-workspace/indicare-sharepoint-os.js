const DOCS_KEY = "indicare.basic.docs.v1";

const recentDocsSeed = [
  ["Daily Lived Experience Record", "Jordan A.", "Daily Record", "Draft", "20 May 2025 10:15"],
  ["Incident Record", "Tyler S.", "Incident", "Under Review", "20 May 2025 09:47"],
  ["Direct Work Record", "Jordan A.", "Direct Work", "Approved", "19 May 2025 16:30"],
  ["Safeguarding Concern", "Casey L.", "Safeguarding", "Under Review", "19 May 2025 14:22"],
  ["Missing From Care Report", "Tyler S.", "Missing From Care", "Draft", "19 May 2025 11:05"],
];

bootSharePointShell();

function bootSharePointShell() {
  document.body.className = "sharepoint-os-body";
  document.body.innerHTML = `
    <div class="sp-os-shell">
      <aside class="sp-sidebar">
        <div class="sp-brand">
          <div class="sp-logo">IC</div>
          <div><strong>IndiCare OS</strong><span>Children's Home Operating System</span></div>
        </div>
        <nav class="sp-nav">
          ${navButton("Dashboard", "dashboard", true)}
          ${navButton("Children", "children")}
          ${navButton("Homes", "homes")}
          ${navButton("IndiCare Docs", "docs")}
          ${navButton("Chronology", "chronology")}
          ${navButton("Safeguarding", "safeguarding")}
          ${navButton("Reviews", "reviews")}
          ${navButton("Workforce", "workforce")}
          ${navButton("Reports", "reports")}
          ${navButton("Settings", "settings")}
        </nav>
        <button class="sp-collapse">‹ Collapse</button>
      </aside>

      <section class="sp-app">
        <header class="sp-topbar">
          <button class="sp-menu" aria-label="Open menu">☰</button>
          <div class="sp-search"><input placeholder="Search children, documents, records..." /><span>⌕</span></div>
          <div class="sp-top-actions"><button class="sp-icon-btn">🔔<b>3</b></button><button class="sp-home-chip">⌂ Riverdale House⌄</button><div class="sp-user"><span>SM</span><div><strong>Sarah M.</strong><small>Key Worker</small></div><i>⌄</i></div></div>
        </header>
        <main class="sp-main" id="sp-main"></main>
      </section>
    </div>
    <section class="sp-ai-bubble"><div><strong>IndiCare AI</strong><span>How can I help you today?</span></div><button>⌃</button><label><input placeholder="Ask IndiCare AI..." /><em>➤</em></label></section>`;
  document.addEventListener("click", handleShellClick);
  renderDashboard();
}

function handleShellClick(event) {
  const nav = event.target.closest("[data-sp-view]");
  if (nav) {
    document.querySelectorAll("[data-sp-view]").forEach((button) => button.classList.toggle("active", button === nav));
    renderView(nav.dataset.spView);
  }
  const openDoc = event.target.closest("[data-open-doc]");
  if (openDoc) renderDocsView();
}

function renderView(view) {
  if (view === "dashboard") return renderDashboard();
  if (view === "docs") return renderDocsView();
  if (view === "reviews") return renderReviewsView();
  if (view === "chronology") return renderChronologyView();
  if (view === "safeguarding") return renderSafeguardingView();
  const title = titleCase(view);
  main().innerHTML = `<section class="sp-page-head"><div><h1>${title}</h1><p>This area is ready for the next build phase.</p></div></section><section class="sp-card"><h2>${title}</h2><p>Basic shell placeholder. IndiCare Docs and operational dashboard are the current priority.</p></section>`;
}

function renderDashboard() {
  const docs = getDocs();
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>Dashboard</h1><p>Welcome back, Sarah. Here's what's happening at Riverdale House today.</p></div><div class="sp-date">📅 20 May 2025</div></section>
    <section class="sp-dashboard-grid">
      <section class="sp-left-content">
        <h2 class="sp-section-title">Today's priorities</h2>
        <div class="sp-priority-grid">
          ${priorityCard("📄", "4", "Documents awaiting review", "View all")}
          ${priorityCard("⚠", "1", "Safeguarding alert", "View all", "amber")}
          ${priorityCard("△", "2", "Missing records identified", "View all", "red")}
          ${priorityCard("📅", "3", "Tasks due today", "View all", "green")}
        </div>
        <section class="sp-card sp-doc-table-card"><div class="sp-card-head"><h2>Recent documents</h2><button data-open-doc>View all documents →</button></div>${documentsTable(docs.length ? docs : seedDocs())}</section>
        <section class="sp-two-col"><div class="sp-card"><div class="sp-card-head"><h2>Missing records</h2><button>View all →</button></div>${miniRows([["Jordan A.","Weekly Wellbeing Check","Due 19 May 2025"],["Tyler S.","Education Record","Due 18 May 2025"],["Casey L.","Family Contact Record","Due 17 May 2025"]], true)}</div><div class="sp-card"><div class="sp-card-head"><h2>Upcoming reviews</h2><button>View all →</button></div>${miniRows([["Jordan A.","Care Plan Review","28 May 2025"],["Tyler S.","Risk Assessment","30 May 2025"],["Casey L.","Placement Review","02 Jun 2025"]])}</div></section>
      </section>
      <aside class="sp-right-content">
        ${safeguardingPanel()}
        ${chronologyPanel()}
      </aside>
    </section>`;
}

function renderDocsView() {
  const docs = getDocs();
  const templates = window.IndiCareDocTemplates?.all?.() || [];
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>IndiCare Docs</h1><p>Open templates, write records, save drafts and submit for review.</p></div><button class="sp-primary" data-new-template="daily-lived-experience">New document</button></section>
    <section class="sp-docs-grid"><section class="sp-card"><h2>Templates</h2><div class="sp-template-list">${templates.map((template) => `<button class="sp-template"><strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.purpose || template.category || "Open full-page document")}</span></button>`).join("") || `<p>Templates are loading.</p>`}</div></section><section class="sp-card"><div class="sp-card-head"><h2>Document library</h2><button>View archived</button></div>${documentsTable(docs.length ? docs : seedDocs())}</section></section>`;
}

function renderReviewsView() {
  main().innerHTML = `<section class="sp-page-head"><div><h1>Reviews</h1><p>Documents submitted for manager review.</p></div></section><section class="sp-card">${documentsTable(seedDocs().filter((doc) => /review/i.test(doc.status)))}</section>`;
}

function renderChronologyView() {
  main().innerHTML = `<section class="sp-page-head"><div><h1>Chronology</h1><p>Basic chronology snapshot for Riverdale House.</p></div></section><section class="sp-card">${chronologyList()}</section>`;
}

function renderSafeguardingView() {
  main().innerHTML = `<section class="sp-page-head"><div><h1>Safeguarding</h1><p>Open safeguarding alerts and related documents.</p></div></section>${safeguardingPanel()}<section class="sp-card">${documentsTable(seedDocs().filter((doc) => /Safeguarding|Incident|Missing/.test(doc.title)))}</section>`;
}

function navButton(label, view, active = false) {
  const icons = { Dashboard: "▦", Children: "♙", Homes: "⌂", "IndiCare Docs": "▤", Chronology: "◴", Safeguarding: "◇", Reviews: "☑", Workforce: "♧", Reports: "▥", Settings: "⚙" };
  return `<button class="${active ? "active" : ""}" data-sp-view="${view}"><span>${icons[label] || "•"}</span>${label}</button>`;
}

function priorityCard(icon, number, label, link, tone = "blue") {
  return `<article class="sp-priority ${tone}"><span>${icon}</span><strong>${number}</strong><p>${label}</p><a>${link} →</a></article>`;
}

function documentsTable(docs) {
  return `<table class="sp-table"><thead><tr><th>Document</th><th>Child</th><th>Type</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${docs.map((doc) => `<tr><td>${escapeHtml(doc.title || doc[0])}</td><td>${escapeHtml(doc.childName || doc[1])}</td><td>${escapeHtml(doc.type || doc[2])}</td><td>${status(doc.status || doc[3])}</td><td>${escapeHtml(doc.updated || doc[4])}</td><td><button class="sp-open-btn">Open</button><button class="sp-kebab">⋮</button></td></tr>`).join("")}</tbody></table>`;
}

function safeguardingPanel() {
  return `<section class="sp-card"><div class="sp-card-head"><h2>Safeguarding alerts</h2><button>View all →</button></div><article class="sp-alert"><span></span><div><b>Low Risk</b><strong>Safeguarding concern reported for Tyler S.</strong><small>Reported on 20 May 2025</small></div><i>›</i></article></section>`;
}

function chronologyPanel() {
  return `<section class="sp-card"><div class="sp-card-head"><h2>Chronology snapshot</h2><button>View full chronology →</button></div>${chronologyList()}</section>`;
}

function chronologyList() {
  return `<div class="sp-timeline"><h3>Today</h3>${timelineItem("10:15", "Daily record submitted", "Jordan A. by Sarah M.")}${timelineItem("09:30", "School attendance recorded", "Jordan A.")}<h3>Yesterday</h3>${timelineItem("16:45", "Football session completed", "Jordan A.", "amber")}${timelineItem("14:20", "Family call completed", "Jordan A.", "purple")}${timelineItem("09:10", "Medication administered", "Jordan A.")}</div>`;
}

function timelineItem(time, title, detail, tone = "blue") {
  return `<div class="sp-time-item ${tone}"><time>${time}</time><span></span><div><strong>${title}</strong><small>${detail}</small></div></div>`;
}

function miniRows(rows, overdue = false) {
  return `<div class="sp-mini-rows">${rows.map(([a,b,c]) => `<p><span>${a}</span><strong>${b}</strong><em class="${overdue ? "overdue" : ""}">${c}</em></p>`).join("")}</div>`;
}

function seedDocs() {
  return recentDocsSeed.map(([title, childName, type, status, updated]) => ({ title, childName, type, status, updated }));
}

function getDocs() {
  try {
    const docs = JSON.parse(localStorage.getItem(DOCS_KEY) || "[]");
    return Array.isArray(docs) ? docs.map((doc) => ({ ...doc, type: doc.category || doc.templateId || "Record", updated: doc.updatedAt ? new Date(doc.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Today" })) : [];
  } catch { return []; }
}

function status(value) {
  const key = String(value || "Draft").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  const label = titleCase(String(value || "Draft").replaceAll("_", " "));
  return `<span class="sp-status ${key}">${escapeHtml(label)}</span>`;
}
function titleCase(value) { return String(value || "").replace(/\b\w/g, (c) => c.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
function main() { return document.getElementById("sp-main"); }
