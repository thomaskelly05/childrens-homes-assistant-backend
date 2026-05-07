const OS_CONTEXT_URL = "/api/os/context";
let liveContext = null;

bootLiveHydrator();

async function bootLiveHydrator() {
  document.addEventListener("click", handleLiveNavigation, true);
  window.addEventListener("indicare:refresh-live-os", hydrateLiveContext);
  await hydrateLiveContext();
  renderLiveDashboard();
}

async function hydrateLiveContext() {
  try {
    const response = await fetch(OS_CONTEXT_URL, { headers: { Accept: "application/json" }, credentials: "include" });
    if (!response.ok) throw new Error(`OS context failed: ${response.status}`);
    const payload = await response.json();
    liveContext = normaliseContext(payload || {});
    window.IndiCareLiveContext = liveContext;
    return liveContext;
  } catch (error) {
    liveContext = normaliseContext({});
    window.IndiCareLiveContext = liveContext;
    return liveContext;
  }
}

function handleLiveNavigation(event) {
  const button = event.target.closest?.("[data-sp-view]");
  if (!button) return;
  const view = button.dataset.spView;
  if (!["dashboard", "children", "docs", "chronology", "safeguarding", "reviews"].includes(view)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  setActive(view);
  if (!liveContext) hydrateLiveContext();
  if (view === "dashboard") renderLiveDashboard();
  if (view === "children") renderLiveChildren();
  if (view === "docs") renderLiveDocs();
  if (view === "chronology") renderLiveChronology();
  if (view === "safeguarding") renderLiveSafeguarding();
  if (view === "reviews") renderLiveReviews();
}

function normaliseContext(payload) {
  return {
    children: arrayFrom(payload.children || payload.items || payload.young_people),
    documents: arrayFrom(payload.documents || payload.records),
    chronology: arrayFrom(payload.chronology || payload.timeline || payload.events),
    safeguarding: arrayFrom(payload.safeguarding || payload.alerts || payload.risks),
    homes: arrayFrom(payload.homes),
    workforce: arrayFrom(payload.workforce || payload.staff),
  };
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.results)) return value.results;
  return [];
}

function renderLiveDashboard() {
  const ctx = liveContext || normaliseContext({});
  main().innerHTML = `
    <section class="sp-page-head">
      <div><h1>Dashboard</h1><p>Live operational view from your IndiCare backend.</p></div>
      <button class="sp-secondary" data-refresh-live>Refresh</button>
    </section>
    <section class="sp-dashboard-grid">
      <section class="sp-left-content">
        <h2 class="sp-section-title">Today's operational position</h2>
        <div class="sp-priority-grid">
          ${priority("♙", ctx.children.length, "Young people", "Loaded from database", "blue")}
          ${priority("📄", ctx.documents.length, "Documents", "Live records", "blue")}
          ${priority("⚠", ctx.safeguarding.length, "Safeguarding items", "Open context", ctx.safeguarding.length ? "amber" : "green")}
          ${priority("◴", ctx.chronology.length, "Chronology entries", "Recent activity", "green")}
        </div>
        <section class="sp-card sp-module-gap">
          <div class="sp-card-head"><h2>Recent live documents</h2><button data-sp-view="docs">Open documents →</button></div>
          ${documentsTable(ctx.documents)}
        </section>
        <section class="sp-two-col">
          <section class="sp-card"><div class="sp-card-head"><h2>Young people</h2><button data-sp-view="children">View all →</button></div>${miniChildren(ctx.children)}</section>
          <section class="sp-card"><div class="sp-card-head"><h2>Recent chronology</h2><button data-sp-view="chronology">Open chronology →</button></div>${chronologyList(ctx.chronology)}</section>
        </section>
      </section>
      <aside class="sp-right-content">
        <section class="sp-card"><div class="sp-card-head"><h2>Safeguarding</h2><button data-sp-view="safeguarding">View all →</button></div>${safeguardingList(ctx.safeguarding)}</section>
        <section class="sp-card"><h2>Backend status</h2><p>${backendStatus(ctx)}</p></section>
      </aside>
    </section>`;
  bindRefresh();
}

function renderLiveChildren() {
  const children = (liveContext || normaliseContext({})).children;
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>Children</h1><p>Young people loaded from the backend.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>
    ${children.length ? `<section class="sp-children-grid">${children.map(childCard).join("")}</section>` : emptyState("No young people returned from /api/children yet.")}`;
  bindRefresh();
}

function renderLiveDocs() {
  const documents = (liveContext || normaliseContext({})).documents;
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>IndiCare Docs</h1><p>Documents and records loaded from the backend.</p></div><button class="sp-primary">New document</button></section>
    <section class="sp-card">${documentsTable(documents)}</section>`;
}

function renderLiveChronology() {
  const chronology = (liveContext || normaliseContext({})).chronology;
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>Chronology</h1><p>Recent chronology entries from your database.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>
    <section class="sp-card">${chronologyList(chronology)}</section>`;
  bindRefresh();
}

function renderLiveSafeguarding() {
  const safeguarding = (liveContext || normaliseContext({})).safeguarding;
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>Safeguarding</h1><p>Safeguarding records, alerts and risk items loaded from the backend.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>
    <section class="sp-card">${safeguardingList(safeguarding)}</section>`;
  bindRefresh();
}

function renderLiveReviews() {
  const records = (liveContext || normaliseContext({})).documents.filter((record) => /review|submitted|pending|draft|changes/i.test(String(record.status || "")));
  main().innerHTML = `
    <section class="sp-page-head"><div><h1>Reviews</h1><p>Records requiring staff or manager action.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>
    <section class="sp-card">${documentsTable(records)}</section>`;
  bindRefresh();
}

function childCard(child) {
  const name = child.name || child.full_name || child.preferred_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person";
  const risk = child.risk || child.summary_risk_level || "Not set";
  return `<article class="sp-child-card"><div class="sp-child-avatar">${initials(name)}</div><div><h2>${escapeHtml(name)}</h2><p>${escapeHtml(child.placement_status || child.status || "Active placement")}</p></div><span class="sp-status ${/high|medium|watch/i.test(risk) ? "submitted-for-review" : "approved"}">${escapeHtml(risk)}</span><dl><div><dt>Home</dt><dd>${escapeHtml(child.home_name || child.home || child.home_id || "Current home")}</dd></div><div><dt>Key worker</dt><dd>${escapeHtml(child.key_worker || child.keyWorker || child.key_worker_id || "Not set")}</dd></div><div><dt>Admission</dt><dd>${escapeHtml(formatDate(child.admission_date) || "Not set")}</dd></div><div><dt>Status</dt><dd>${escapeHtml(child.status || child.placement_status || "Active")}</dd></div></dl><footer><button class="sp-open-btn" data-sp-view="docs">Docs</button><button class="sp-open-btn" data-sp-view="chronology">Chronology</button></footer></article>`;
}

function documentsTable(documents) {
  if (!documents.length) return emptyState("No documents or records returned from /api/documents yet.");
  return `<table class="sp-table"><thead><tr><th>Document</th><th>Child</th><th>Type</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${documents.map((doc) => `<tr><td>${escapeHtml(doc.title || doc.summary || "Care record")}</td><td>${escapeHtml(doc.child_name || doc.young_person_name || doc.young_person_id || "—")}</td><td>${escapeHtml(doc.type || doc.record_type || "Record")}</td><td>${status(doc.status || "recorded")}</td><td>${escapeHtml(formatDate(doc.updated_at || doc.created_at))}</td><td><button class="sp-open-btn">Open</button></td></tr>`).join("")}</tbody></table>`;
}

function chronologyList(entries) {
  if (!entries.length) return emptyState("No chronology entries returned from /api/chronology yet.");
  return `<div class="sp-timeline">${entries.slice(0, 30).map((entry) => `<div class="sp-time-item ${/high|significant|safeguarding/i.test(String(entry.severity || entry.significance || entry.category || "")) ? "amber" : "blue"}"><time>${escapeHtml(formatDate(entry.occurred_at || entry.event_datetime || entry.created_at))}</time><span></span><div><strong>${escapeHtml(entry.title || entry.category || "Chronology entry")}</strong><small>${escapeHtml(entry.summary || entry.narrative || entry.child_name || "Recorded activity")}</small></div></div>`).join("")}</div>`;
}

function safeguardingList(items) {
  if (!items.length) return emptyState("No safeguarding items returned from /api/safeguarding yet.");
  return `<div class="sp-mini-rows">${items.slice(0, 20).map((item) => `<p><span>${escapeHtml(item.child_name || item.young_person_id || item.type || "Item")}</span><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding record")}</strong><em>${escapeHtml(item.severity || item.status || item.risk_level || "Open")}</em></p>`).join("")}</div>`;
}

function miniChildren(children) {
  if (!children.length) return emptyState("No young people returned from /api/children yet.");
  return `<div class="sp-mini-rows">${children.slice(0, 8).map((child) => `<p><span>${escapeHtml(child.name || child.preferred_name || "Young person")}</span><strong>${escapeHtml(child.status || child.placement_status || "Active")}</strong><em>${escapeHtml(child.risk || child.summary_risk_level || "—")}</em></p>`).join("")}</div>`;
}

function priority(icon, value, label, sub, tone = "blue") {
  return `<article class="sp-priority ${tone}"><span>${icon}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(label)}</p><a>${escapeHtml(sub)} →</a></article>`;
}

function status(value) {
  const key = String(value || "").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return `<span class="sp-status ${escapeHtml(key)}">${escapeHtml(titleCase(String(value || "Recorded").replaceAll("_", " ")))}</span>`;
}

function backendStatus(ctx) {
  const total = ctx.children.length + ctx.documents.length + ctx.chronology.length + ctx.safeguarding.length + ctx.homes.length + ctx.workforce.length;
  return total ? `${total} live records loaded through /api/os/context.` : "The live shell is connected to /api/os/context, but the backend returned no operational records for this user/session yet.";
}

function emptyState(message) {
  return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`;
}

function bindRefresh() {
  document.querySelector("[data-refresh-live]")?.addEventListener("click", async () => {
    await hydrateLiveContext();
    renderLiveDashboard();
  }, { once: true });
}

function setActive(view) {
  document.querySelectorAll("[data-sp-view]").forEach((item) => item.classList.toggle("active", item.dataset.spView === view));
}

function main() { return document.getElementById("sp-main"); }
function initials(name) { return String(name || "IC").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "IC"; }
function titleCase(value) { return String(value || "").replace(/\b\w/g, (c) => c.toUpperCase()); }
function formatDate(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
