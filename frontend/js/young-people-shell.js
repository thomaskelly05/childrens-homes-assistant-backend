const state = {
 section: "command-centre",
 tab: "overview",
 youngPeople: [],
 selected: null,
 commandCentre: null,
};

const ROUTES = {
 dailyNotes: (id) => `/young-people/${id}/daily-notes`,
 incidents: (id) => `/young-people/${id}/incidents`,
 health: (id) => `/young-people/${id}/health`,
 education: (id) => `/young-people/${id}/education`,
 family: (id) => `/young-people/${id}/family`,
 keywork: (id) => `/young-people/${id}/keywork`,
};

const $ = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];
const arr = (d) => Array.isArray(d) ? d : d?.data || [];
const esc = (s) => String(s ?? "");
const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-GB") : "—";
const fmtDateTime = (v) => v ? new Date(v).toLocaleString("en-GB") : "—";

async function api(url, options = {}) {
 const res = await fetch(url, {
 credentials: "include",
 headers: { "Content-Type": "application/json" },
 ...options
 });
 if (!res.ok) throw new Error(`${url} (${res.status})`);
 return res.json();
}

/* =========================
 MODAL SYSTEM
========================= */
function openModal(title, meta, html) {
 $("globalModal").classList.remove("hidden");
 $("modalTitle").textContent = title || "Document";
 $("modalMeta").textContent = meta || "—";
 $("modalBody").innerHTML = html || "";
}

function closeModal() {
 $("globalModal").classList.add("hidden");
}

$("modalCloseBtn").onclick = closeModal;
$("modalOverlay").onclick = closeModal;

/* =========================
 WELCOME MESSAGE
========================= */
function setWelcome(name = "Staff") {
 const h = new Date().getHours();
 let t = "evening";
 if (h < 12) t = "morning";
 else if (h < 17) t = "afternoon";

 $("welcomeMessage").textContent =
 `Good ${t}, ${name}. Here's your shift overview.`;
}

/* =========================
 NAVIGATION
========================= */
function setSection(section) {
 state.section = section;

 $$(".nav-btn").forEach(b =>
 b.classList.toggle("active", b.dataset.section === section)
 );

 $$(".section").forEach(s =>
 s.classList.toggle("active", s.id === `section-${section}`)
 );

 if (section === "command-centre") loadCommandCentre();
 if (section === "young-people") loadOverview();
}

function setTab(tab) {
 state.tab = tab;

 $$(".tab").forEach(b =>
 b.classList.toggle("active", b.dataset.tab === tab)
 );

 $$(".panel").forEach(p =>
 p.classList.toggle("active", p.id === `tab-${tab}`)
 );

 const map = {
 overview: loadOverview,
 timeline: loadTimeline,
 "daily-notes": loadDailyNotes,
 incidents: loadIncidents,
 health: loadHealth,
 education: loadEducation,
 family: loadFamily,
 keywork: loadKeywork,
 plans: loadPlans,
 reviews: loadReviews,
 };

 (map[tab] || loadOverview)();
}

/* =========================
 COMMAND CENTRE
========================= */
async function loadCommandCentre() {
 try {
 const d = await api("/command-centre");

 $("commandCentreMetrics").innerHTML = `
 <div class="metric-card">Children<br><b>${d.summary?.children_in_home || 0}</b></div>
 <div class="metric-card">Alerts<br><b>${(d.alerts || []).length}</b></div>
 <div class="metric-card">Tasks<br><b>${(d.tasks || []).length}</b></div>
 `;

 $("commandCentreAlerts").innerHTML = renderRows(d.alerts, "Alert");
 $("commandCentreTasks").innerHTML = renderRows(d.tasks, "Task");

 } catch (e) {
 console.error(e);
 }
}

function renderRows(rows = [], type = "Item") {
 if (!rows.length) return `<div class="muted">No ${type.toLowerCase()}s</div>`;

 return rows.map(r => `
 <div class="row-card open-row">
 <div class="row-title">${esc(r.title || type)}</div>
 <div class="row-meta">${esc(r.detail || "")}</div>
 </div>
 `).join("");
}

/* =========================
 YOUNG PEOPLE
========================= */
async function loadYoungPeople() {
 const rows = arr(await api("/young-people"));
 state.youngPeople = rows;

 $("youngPersonSelect").innerHTML = rows.map(p =>
 `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`
 ).join("");

 state.selected = rows[0];
 loadOverview();
}

async function loadOverview() {
 if (!state.selected) return;

 const d = await api(`/young-people/${state.selected.id}`);

 $("overviewContent").innerHTML = `
 <div class="card">
 <h3>Summary</h3>
 <p>${esc(d.summary_risk || "No summary")}</p>
 </div>
 `;
}

/* =========================
 COLLECTION LOADERS
========================= */
async function loadDailyNotes() {
 const rows = arr(await api(ROUTES.dailyNotes(state.selected.id)));
 renderCollection("dailyNotesContent", rows, "Daily Note");
}

async function loadIncidents() {
 const rows = arr(await api(ROUTES.incidents(state.selected.id)));
 renderCollection("incidentsContent", rows, "Incident");
}

async function loadHealth() {
 const rows = arr(await api(ROUTES.health(state.selected.id)));
 renderCollection("healthContent", rows, "Health");
}

async function loadEducation() {
 const rows = arr(await api(ROUTES.education(state.selected.id)));
 renderCollection("educationContent", rows, "Education");
}

async function loadFamily() {
 const rows = arr(await api(ROUTES.family(state.selected.id)));
 renderCollection("familyContent", rows, "Family");
}

async function loadKeywork() {
 const rows = arr(await api(ROUTES.keywork(state.selected.id)));
 renderCollection("keyworkContent", rows, "Keywork");
}

function renderCollection(target, rows, type) {
 $(target).innerHTML = rows.map(r => `
 <div class="row-card open-record">
 <div class="row-title">${esc(r.title || type)}</div>
 <div class="row-meta">${fmtDateTime(r.created_at)}</div>
 </div>
 `).join("");

 $$(".open-record").forEach(el => {
 el.onclick = () => openModal(type, "Editable record", `
 <div class="card">
 <label class="label">Notes</label>
 <textarea class="textarea"></textarea>
 <button class="btn primary">Save</button>
 </div>
 `);
 });
}

/* =========================
 CREATE ACTIONS
========================= */
function openNew(type) {
 openModal(`New ${type}`, "Create record", `
 <div class="card">
 <label class="label">Details</label>
 <textarea class="textarea"></textarea>
 <button class="btn primary">Save</button>
 </div>
 `);
}

/* =========================
 FLOATING MENU
========================= */
$("fabButton").onclick = () => {
 $("fabMenu").classList.toggle("hidden");
};

$("fabDailyNoteBtn").onclick = () => openNew("Daily note");
$("fabIncidentBtn").onclick = () => openNew("Incident");
$("fabHealthBtn").onclick = () => openNew("Health");
$("fabFamilyBtn").onclick = () => openNew("Contact");
$("fabKeyworkBtn").onclick = () => openNew("Keywork");
$("fabPlanBtn").onclick = () => openNew("Plan");

/* =========================
 INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
 setWelcome("Sarah"); // replace later with real user
 loadYoungPeople();

 $$(".nav-btn").forEach(btn =>
 btn.onclick = () => setSection(btn.dataset.section)
 );

 $$(".tab").forEach(btn =>
 btn.onclick = () => setTab(btn.dataset.tab)
 );

 $("youngPersonSelect").onchange = (e) => {
 state.selected = state.youngPeople.find(p => p.id == e.target.value);
 loadOverview();
 };
});
