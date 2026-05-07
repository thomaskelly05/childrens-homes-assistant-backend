const OS_CONTEXT_URL = "/api/os/context";
const SESSION_KEY = "indicare.os.operational.session.v1";
let liveContext = null;
let operationalSession = loadSession();

bootLiveHydrator();

async function bootLiveHydrator() {
  document.addEventListener("click", handleLiveNavigation, true);
  document.addEventListener("click", handleLaunchFlow, true);
  window.addEventListener("indicare:refresh-live-os", hydrateLiveContext);
  await hydrateLiveContext();
  if (operationalSession?.homeId || operationalSession?.homeName) renderLiveDashboard();
  else renderLaunchExperience();
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

function handleLaunchFlow(event) {
  const refresh = event.target.closest?.("[data-refresh-live]");
  if (refresh) {
    event.preventDefault();
    hydrateLiveContext().then(() => renderLaunchExperience());
    return;
  }
  const reset = event.target.closest?.("[data-reset-session]");
  if (reset) {
    event.preventDefault();
    operationalSession = null;
    localStorage.removeItem(SESSION_KEY);
    renderLaunchExperience();
    return;
  }
  const homeButton = event.target.closest?.("[data-select-home]");
  if (homeButton) {
    event.preventDefault();
    const home = (liveContext?.homes || []).find((item) => String(item.id || item.name) === homeButton.dataset.selectHome);
    operationalSession = {
      homeId: home?.id || null,
      homeName: home?.name || home?.home_name || "Selected home",
      selectedChildren: [],
      startedAt: new Date().toISOString(),
    };
    saveSession();
    renderLaunchExperience("children");
    return;
  }
  const childToggle = event.target.closest?.("[data-toggle-child]");
  if (childToggle) {
    event.preventDefault();
    const id = childToggle.dataset.toggleChild;
    const current = new Set(operationalSession?.selectedChildren || []);
    if (current.has(id)) current.delete(id); else current.add(id);
    operationalSession = { ...(operationalSession || {}), selectedChildren: [...current] };
    saveSession();
    renderLaunchExperience("children");
    return;
  }
  const launch = event.target.closest?.("[data-launch-session]");
  if (launch) {
    event.preventDefault();
    operationalSession = { ...(operationalSession || {}), launchedAt: new Date().toISOString() };
    saveSession();
    window.IndiCareOperationalSession = operationalSession;
    renderLiveDashboard();
  }
}

function renderLaunchExperience(step = "home") {
  setActive("dashboard");
  const ctx = liveContext || normaliseContext({});
  const user = currentUser();
  const homes = ctx.homes;
  const activeHomeId = operationalSession?.homeId ? String(operationalSession.homeId) : null;
  const activeHomeName = operationalSession?.homeName || "No home selected";
  const childrenForHome = ctx.children.filter((child) => !operationalSession?.homeId || String(child.home_id || child.homeId || child.home || child.home_name || "") === String(operationalSession.homeId) || String(child.home_name || child.home || "") === activeHomeName);
  const childrenToShow = childrenForHome.length ? childrenForHome : ctx.children;
  main().innerHTML = `
    <section class="os-launch">
      <div class="os-launch-hero">
        <div class="os-launch-kicker">IndiCare OS · Operational session</div>
        <h1>Start your shift with the right home and young people in focus.</h1>
        <p>This screen uses live database context only. Select the home and young people you are actively supporting before entering the operating system.</p>
        <div class="os-launch-identity">
          <span>${escapeHtml(initials(user.name))}</span>
          <div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.role)}${activeHomeName ? ` · ${escapeHtml(activeHomeName)}` : ""}</small></div>
        </div>
      </div>
      <aside class="os-launch-pulse">
        ${launchMetric("Homes", homes.length, "Available to this session")}
        ${launchMetric("Young people", ctx.children.length, "Loaded from database")}
        ${launchMetric("Safeguarding", ctx.safeguarding.length, "Live alerts and records", ctx.safeguarding.length ? "amber" : "green")}
        ${launchMetric("Records", ctx.documents.length, "Documents and reviews")}
      </aside>
    </section>
    <section class="os-launch-steps">
      <div class="os-step ${step === "home" ? "active" : "done"}"><b>1</b><span>Choose home</span></div>
      <div class="os-step ${step === "children" ? "active" : activeHomeId ? "done" : ""}"><b>2</b><span>Select young people</span></div>
      <div class="os-step ${operationalSession?.selectedChildren?.length ? "active" : ""}"><b>3</b><span>Launch session</span></div>
    </section>
    ${step === "children" && homes.length ? renderChildSelection(childrenToShow) : renderHomeSelection(homes)}
  `;
  hydrateTopbarIdentity();
}

function renderHomeSelection(homes) {
  if (!homes.length) {
    return `<section class="os-launch-empty"><h2>No homes are currently available for this login.</h2><p>The OS is connected to live backend data, but /api/homes returned no homes for this user/session. Once home permissions are assigned, they will appear here.</p><button class="sp-secondary" data-refresh-live>Refresh live data</button></section>`;
  }
  return `<section class="os-home-grid">${homes.map((home) => {
    const id = String(home.id || home.name || home.home_name);
    const childrenCount = (liveContext?.children || []).filter((child) => String(child.home_id || child.homeId || child.home || child.home_name || "") === String(home.id || home.name || home.home_name)).length;
    return `<article class="os-home-card"><div class="os-home-card-top"><div><span>Residential home</span><h2>${escapeHtml(home.name || home.home_name || "Home")}</h2></div><b>${escapeHtml(home.status || "Active")}</b></div><div class="os-home-stats"><p><strong>${childrenCount}</strong><span>Young people</span></p><p><strong>${escapeHtml(home.safeguarding_count || "—")}</strong><span>Safeguarding</span></p><p><strong>${escapeHtml(home.records_due || "—")}</strong><span>Records due</span></p></div><button class="sp-primary" data-select-home="${escapeHtml(id)}">Work in this home</button></article>`;
  }).join("")}</section>`;
}

function renderChildSelection(children) {
  const selected = new Set(operationalSession?.selectedChildren || []);
  return `<section class="os-selection-head"><div><h2>Select the young people you are supporting</h2><p>These selections power the dashboard, chronology, documents and assistant context.</p></div><div><button class="sp-secondary" data-reset-session>Change home</button><button class="sp-primary" data-launch-session ${selected.size ? "" : "disabled"}>Launch OS</button></div></section>${children.length ? `<section class="os-child-select-grid">${children.map((child) => childSelectionCard(child, selected)).join("")}</section>` : `<section class="os-launch-empty"><h2>No young people returned for ${escapeHtml(operationalSession?.homeName || "this home")}.</h2><p>The OS will not show demo children. Add or assign young people in the database to continue.</p></section>`}`;
}

function childSelectionCard(child, selected) {
  const id = String(child.id || child.young_person_id || child.name);
  const name = child.name || child.full_name || child.preferred_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person";
  const isSelected = selected.has(id);
  return `<article class="os-child-select ${isSelected ? "selected" : ""}" data-toggle-child="${escapeHtml(id)}"><div class="sp-child-avatar">${initials(name)}</div><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(child.placement_status || child.status || "Active placement")}</p></div><span class="sp-status ${/high|medium|watch/i.test(String(child.risk || child.summary_risk_level || "")) ? "submitted-for-review" : "approved"}">${escapeHtml(child.risk || child.summary_risk_level || "Risk not set")}</span><dl><div><dt>Home</dt><dd>${escapeHtml(child.home_name || child.home || operationalSession?.homeName || "Selected home")}</dd></div><div><dt>Admission</dt><dd>${escapeHtml(formatDate(child.admission_date) || "Not set")}</dd></div></dl><button class="sp-open-btn">${isSelected ? "Selected" : "Select"}</button></article>`;
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

function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; return []; }

function renderLiveDashboard() {
  const ctx = filterContextBySession(liveContext || normaliseContext({}));
  hydrateTopbarIdentity();
  main().innerHTML = `
    <section class="sp-page-head"><div><button class="sp-back" data-reset-session>Change operational session</button><h1>Dashboard</h1><p>Live operational view for ${escapeHtml(operationalSession?.homeName || "your selected context")}.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>
    <section class="sp-dashboard-grid"><section class="sp-left-content"><h2 class="sp-section-title">Current operational position</h2><div class="sp-priority-grid">${priority("♙", ctx.children.length, "Young people", "Selected/live context", "blue")}${priority("📄", ctx.documents.length, "Documents", "Live records", "blue")}${priority("⚠", ctx.safeguarding.length, "Safeguarding items", "Open context", ctx.safeguarding.length ? "amber" : "green")}${priority("◴", ctx.chronology.length, "Chronology entries", "Recent activity", "green")}</div><section class="sp-card sp-module-gap"><div class="sp-card-head"><h2>Recent live documents</h2><button data-sp-view="docs">Open documents →</button></div>${documentsTable(ctx.documents)}</section><section class="sp-two-col"><section class="sp-card"><div class="sp-card-head"><h2>Young people</h2><button data-sp-view="children">View all →</button></div>${miniChildren(ctx.children)}</section><section class="sp-card"><div class="sp-card-head"><h2>Recent chronology</h2><button data-sp-view="chronology">Open chronology →</button></div>${chronologyList(ctx.chronology)}</section></section></section><aside class="sp-right-content"><section class="sp-card"><div class="sp-card-head"><h2>Safeguarding</h2><button data-sp-view="safeguarding">View all →</button></div>${safeguardingList(ctx.safeguarding)}</section><section class="sp-card"><h2>Live data status</h2><p>${backendStatus(ctx)}</p></section></aside></section>`;
  bindRefresh();
}

function filterContextBySession(ctx) {
  const selected = new Set((operationalSession?.selectedChildren || []).map(String));
  const children = selected.size ? ctx.children.filter((child) => selected.has(String(child.id || child.young_person_id || child.name))) : ctx.children;
  const ids = new Set(children.map((child) => String(child.id || child.young_person_id || child.name)));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childName || item.child_name || ""));
  return { ...ctx, children, documents: ctx.documents.filter(filterByChild), chronology: ctx.chronology.filter(filterByChild), safeguarding: ctx.safeguarding.filter(filterByChild) };
}

function renderLiveChildren() { const children = filterContextBySession(liveContext || normaliseContext({})).children; main().innerHTML = `<section class="sp-page-head"><div><h1>Children</h1><p>Young people loaded from the backend for this operational session.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section>${children.length ? `<section class="sp-children-grid">${children.map(childCard).join("")}</section>` : emptyState("No young people returned for this operational session.")}`; bindRefresh(); }
function renderLiveDocs() { const documents = filterContextBySession(liveContext || normaliseContext({})).documents; main().innerHTML = `<section class="sp-page-head"><div><h1>IndiCare Docs</h1><p>Documents and records loaded from the backend.</p></div><button class="sp-primary">New document</button></section><section class="sp-card">${documentsTable(documents)}</section>`; }
function renderLiveChronology() { const chronology = filterContextBySession(liveContext || normaliseContext({})).chronology; main().innerHTML = `<section class="sp-page-head"><div><h1>Chronology</h1><p>Recent chronology entries from your database.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section><section class="sp-card">${chronologyList(chronology)}</section>`; bindRefresh(); }
function renderLiveSafeguarding() { const safeguarding = filterContextBySession(liveContext || normaliseContext({})).safeguarding; main().innerHTML = `<section class="sp-page-head"><div><h1>Safeguarding</h1><p>Safeguarding records, alerts and risk items loaded from the backend.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section><section class="sp-card">${safeguardingList(safeguarding)}</section>`; bindRefresh(); }
function renderLiveReviews() { const records = filterContextBySession(liveContext || normaliseContext({})).documents.filter((record) => /review|submitted|pending|draft|changes/i.test(String(record.status || ""))); main().innerHTML = `<section class="sp-page-head"><div><h1>Reviews</h1><p>Records requiring staff or manager action.</p></div><button class="sp-secondary" data-refresh-live>Refresh</button></section><section class="sp-card">${documentsTable(records)}</section>`; bindRefresh(); }

function childCard(child) { const name = child.name || child.full_name || child.preferred_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; const risk = child.risk || child.summary_risk_level || "Not set"; return `<article class="sp-child-card"><div class="sp-child-avatar">${initials(name)}</div><div><h2>${escapeHtml(name)}</h2><p>${escapeHtml(child.placement_status || child.status || "Active placement")}</p></div><span class="sp-status ${/high|medium|watch/i.test(risk) ? "submitted-for-review" : "approved"}">${escapeHtml(risk)}</span><dl><div><dt>Home</dt><dd>${escapeHtml(child.home_name || child.home || child.home_id || "Current home")}</dd></div><div><dt>Key worker</dt><dd>${escapeHtml(child.key_worker || child.keyWorker || child.key_worker_id || "Not set")}</dd></div><div><dt>Admission</dt><dd>${escapeHtml(formatDate(child.admission_date) || "Not set")}</dd></div><div><dt>Status</dt><dd>${escapeHtml(child.status || child.placement_status || "Active")}</dd></div></dl><footer><button class="sp-open-btn" data-sp-view="docs">Docs</button><button class="sp-open-btn" data-sp-view="chronology">Chronology</button></footer></article>`; }
function documentsTable(documents) { if (!documents.length) return emptyState("No documents or records returned from the database for this context."); return `<table class="sp-table"><thead><tr><th>Document</th><th>Child</th><th>Type</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>${documents.map((doc) => `<tr><td>${escapeHtml(doc.title || doc.summary || "Care record")}</td><td>${escapeHtml(doc.child_name || doc.young_person_name || doc.young_person_id || "—")}</td><td>${escapeHtml(doc.type || doc.record_type || "Record")}</td><td>${status(doc.status || "recorded")}</td><td>${escapeHtml(formatDate(doc.updated_at || doc.created_at))}</td><td><button class="sp-open-btn">Open</button></td></tr>`).join("")}</tbody></table>`; }
function chronologyList(entries) { if (!entries.length) return emptyState("No chronology entries returned from the database for this context."); return `<div class="sp-timeline">${entries.slice(0, 30).map((entry) => `<div class="sp-time-item ${/high|significant|safeguarding/i.test(String(entry.severity || entry.significance || entry.category || "")) ? "amber" : "blue"}"><time>${escapeHtml(formatDate(entry.occurred_at || entry.event_datetime || entry.created_at))}</time><span></span><div><strong>${escapeHtml(entry.title || entry.category || "Chronology entry")}</strong><small>${escapeHtml(entry.summary || entry.narrative || entry.child_name || "Recorded activity")}</small></div></div>`).join("")}</div>`; }
function safeguardingList(items) { if (!items.length) return emptyState("No safeguarding items returned from the database for this context."); return `<div class="sp-mini-rows">${items.slice(0, 20).map((item) => `<p><span>${escapeHtml(item.child_name || item.young_person_id || item.type || "Item")}</span><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding record")}</strong><em>${escapeHtml(item.severity || item.status || item.risk_level || "Open")}</em></p>`).join("")}</div>`; }
function miniChildren(children) { if (!children.length) return emptyState("No young people returned from the database for this context."); return `<div class="sp-mini-rows">${children.slice(0, 8).map((child) => `<p><span>${escapeHtml(child.name || child.preferred_name || "Young person")}</span><strong>${escapeHtml(child.status || child.placement_status || "Active")}</strong><em>${escapeHtml(child.risk || child.summary_risk_level || "—")}</em></p>`).join("")}</div>`; }
function launchMetric(label, value, sub, tone = "blue") { return `<article class="os-launch-metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(sub)}</small></article>`; }
function priority(icon, value, label, sub, tone = "blue") { return `<article class="sp-priority ${tone}"><span>${icon}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(label)}</p><a>${escapeHtml(sub)} →</a></article>`; }
function status(value) { const key = String(value || "").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-"); return `<span class="sp-status ${escapeHtml(key)}">${escapeHtml(titleCase(String(value || "Recorded").replaceAll("_", " ")))}</span>`; }
function backendStatus(ctx) { const total = ctx.children.length + ctx.documents.length + ctx.chronology.length + ctx.safeguarding.length + ctx.homes.length + ctx.workforce.length; return total ? `${total} live records loaded through /api/os/context.` : "The live shell is connected to /api/os/context, but the backend returned no operational records for this user/session yet."; }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function bindRefresh() { document.querySelector("[data-refresh-live]")?.addEventListener("click", async () => { await hydrateLiveContext(); renderLaunchExperience(); }, { once: true }); }
function hydrateTopbarIdentity() { const user = currentUser(); const userBox = document.querySelector(".sp-user"); if (userBox) userBox.innerHTML = `<span>${escapeHtml(initials(user.name))}</span><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.role)}</small></div><i>⌄</i>`; const homeChip = document.querySelector(".sp-home-chip"); if (homeChip) homeChip.textContent = `⌂ ${operationalSession?.homeName || "Choose home"}⌄`; }
function currentUser() { const first = localStorage.getItem("first_name") || ""; const last = localStorage.getItem("last_name") || ""; const email = localStorage.getItem("email") || ""; return { name: [first, last].filter(Boolean).join(" ").trim() || email || "Signed-in adult", role: localStorage.getItem("role") || "Residential care staff" }; }
function saveSession() { localStorage.setItem(SESSION_KEY, JSON.stringify(operationalSession || {})); window.IndiCareOperationalSession = operationalSession; }
function loadSession() { try { const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); window.IndiCareOperationalSession = session; return session; } catch { return null; } }
function setActive(view) { document.querySelectorAll("[data-sp-view]").forEach((item) => item.classList.toggle("active", item.dataset.spView === view)); }
function main() { return document.getElementById("sp-main"); }
function initials(name) { return String(name || "IC").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "IC"; }
function titleCase(value) { return String(value || "").replace(/\b\w/g, (c) => c.toUpperCase()); }
function formatDate(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
