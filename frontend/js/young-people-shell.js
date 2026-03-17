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
  plans: (id) => `/young-people/${id}/plans`,
  reviews: (id) => `/young-people/${id}/reviews`,
};

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const arr = (data) => (Array.isArray(data) ? data : data?.data || []);
const esc = (value) => String(value ?? "");
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("en-GB") : "—");
const fmtDateTime = (value) => (value ? new Date(value).toLocaleString("en-GB") : "—");

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`${url} (${res.status})`);
  }

  return res.json();
}

function showStatus(message, isError = false) {
  const bar = $("statusBar");
  if (!bar) return;

  bar.textContent = message;
  bar.classList.remove("hidden");
  bar.style.color = isError ? "var(--red)" : "var(--primary-strong)";

  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => {
    bar.classList.add("hidden");
    bar.textContent = "";
    bar.style.color = "";
  }, 3000);
}

/* =========================
   MODAL SYSTEM
========================= */
function openModal(title, meta, html) {
  $("globalModal").classList.remove("hidden");
  $("modalTitle").textContent = title || "Document";
  $("modalMeta").textContent = meta || "—";
  $("modalBody").innerHTML = html || "";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("globalModal").classList.add("hidden");
  $("modalBody").innerHTML = "";
  document.body.style.overflow = "";
}

/* =========================
   WELCOME MESSAGE
========================= */
function setWelcome(name = "Staff") {
  const hour = new Date().getHours();
  let period = "evening";

  if (hour < 12) period = "morning";
  else if (hour < 17) period = "afternoon";

  $("welcomeMessage").textContent = `Good ${period}, ${name}. Here's your shift overview.`;
}

/* =========================
   HEADER
========================= */
function updateHeader() {
  const pageTitle = $("pageTitle");
  const pageSubtitle = $("pageSubtitle");

  const selectedName = state.selected
    ? `${esc(state.selected.first_name || "")} ${esc(state.selected.last_name || "")}`.trim()
    : "Young People";

  const config = {
    "command-centre": {
      title: "Command Centre",
      subtitle: "Shift-first oversight for children’s residential care",
    },
    "young-people": {
      title: selectedName || "Young People",
      subtitle: "Single child view across records, chronology and plans",
    },
    handover: {
      title: "Handover",
      subtitle: "Continuity from the previous shift",
    },
    "manager-qa": {
      title: "Manager QA",
      subtitle: "Approve, return and quality assure records",
    },
    staff: {
      title: "Staff",
      subtitle: "Supervision, journals and operational records",
    },
  };

  const current = config[state.section] || config["command-centre"];
  pageTitle.textContent = current.title;
  pageSubtitle.textContent = current.subtitle;
}

/* =========================
   NAVIGATION
========================= */
function setSection(section) {
  state.section = section;

  $$(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });

  $$(".section").forEach((sectionEl) => {
    sectionEl.classList.toggle("active", sectionEl.id === `section-${section}`);
  });

  updateHeader();

  if (section === "command-centre") loadCommandCentre();
  if (section === "young-people") loadCurrentTab();
  if (section === "handover") loadHandover();
  if (section === "manager-qa") loadManagerQA();
}

function setTab(tab) {
  state.tab = tab;

  $$(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  $$(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });

  loadCurrentTab();
}

function loadCurrentTab() {
  if (!state.selected) return;

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
    archive: loadArchive,
    reviews: loadReviews,
  };

  (map[state.tab] || loadOverview)();
  renderYoungPersonHero();
  updateHeader();
}

/* =========================
   COMMAND CENTRE
========================= */
async function loadCommandCentre() {
  try {
    const data = await api("/command-centre");
    state.commandCentre = data;

    const alerts = arr(data.alerts);
    const tasks = arr(data.tasks);
    const meds = arr(data.medication_due || data.meds);
    const handover = arr(data.latest_handover || data.handover);

    $("commandCentreMetrics").innerHTML = `
      <div class="metric-card">
        <div class="metric-label">Children</div>
        <div class="metric-value">${esc(data.summary?.children_in_home || 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Alerts</div>
        <div class="metric-value">${esc(alerts.length)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tasks</div>
        <div class="metric-value">${esc(tasks.length)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Medication due</div>
        <div class="metric-value">${esc(meds.length)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Handover items</div>
        <div class="metric-value">${esc(handover.length || (data.handover ? 1 : 0))}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Open reviews</div>
        <div class="metric-value">${esc(data.summary?.reviews_due || 0)}</div>
      </div>
    `;

    $("commandCentreAlerts").innerHTML = renderRows(alerts, "Alert");
    $("commandCentreTasks").innerHTML = renderRows(tasks, "Task");
    $("commandCentreMeds").innerHTML = renderRows(meds, "Medication");
    $("commandCentreHandover").innerHTML = renderRows(handover.length ? handover : data.handover ? [data.handover] : [], "Handover");
  } catch (error) {
    console.error(error);
    $("commandCentreMetrics").innerHTML = "";
    $("commandCentreAlerts").innerHTML = `<div class="muted">Unable to load command centre</div>`;
    $("commandCentreTasks").innerHTML = `<div class="muted">Unable to load tasks</div>`;
    $("commandCentreMeds").innerHTML = `<div class="muted">Unable to load medication</div>`;
    $("commandCentreHandover").innerHTML = `<div class="muted">Unable to load handover</div>`;
    showStatus("Could not load command centre.", true);
  }
}

function renderRows(rows = [], type = "Item") {
  if (!rows.length) {
    return `<div class="muted">No ${type.toLowerCase()}s</div>`;
  }

  return rows
    .map((row) => {
      const title = row.title || row.name || row.subject || type;
      const detail =
        row.detail ||
        row.summary ||
        row.description ||
        row.notes ||
        row.status ||
        row.message ||
        "";
      const when = row.created_at || row.updated_at || row.date || row.due_at;

      return `
        <div class="row-card">
          <div class="row-title">${esc(title)}</div>
          <div class="row-meta">${esc(detail)}</div>
          ${when ? `<div class="row-meta">${fmtDateTime(when)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

/* =========================
   YOUNG PEOPLE
========================= */
async function loadYoungPeople() {
  try {
    const rows = arr(await api("/young-people"));
    state.youngPeople = rows;

    $("youngPersonSelect").innerHTML = rows.length
      ? rows
          .map((person) => {
            const label = `${esc(person.first_name || "")} ${esc(person.last_name || "")}`.trim() || `Young person ${person.id}`;
            return `<option value="${person.id}">${label}</option>`;
          })
          .join("")
      : `<option value="">No young people found</option>`;

    state.selected = rows[0] || null;

    renderYoungPersonHero();
    updateHeader();

    if (state.selected) {
      loadCurrentTab();
    }
  } catch (error) {
    console.error(error);
    $("youngPersonSelect").innerHTML = `<option value="">Unable to load</option>`;
    showStatus("Could not load young people.", true);
  }
}

function renderYoungPersonHero() {
  const nameEl = $("selectedYoungPersonName");
  const metaEl = $("selectedYoungPersonMeta");
  const badgesEl = $("selectedYoungPersonBadges");

  if (!state.selected) {
    nameEl.textContent = "—";
    metaEl.textContent = "—";
    badgesEl.innerHTML = "";
    return;
  }

  const fullName =
    `${state.selected.first_name || ""} ${state.selected.last_name || ""}`.trim() || "Young person";

  nameEl.textContent = fullName;

  const metaParts = [
    state.selected.age ? `${state.selected.age}` : null,
    state.selected.room ? `Room ${state.selected.room}` : null,
    state.selected.legal_status || null,
    state.selected.placement_type || null,
  ].filter(Boolean);

  metaEl.textContent = metaParts.length ? metaParts.join(" • ") : "No summary available";

  const badges = [
    state.selected.risk_level ? `<span class="pill red">${esc(state.selected.risk_level)}</span>` : "",
    state.selected.status ? `<span class="pill blue">${esc(state.selected.status)}</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  badgesEl.innerHTML = badges;
}

async function loadOverview() {
  if (!state.selected) return;

  try {
    const data = await api(`/young-people/${state.selected.id}`);

    $("overviewContent").innerHTML = `
      <div class="grid two-col">
        <div class="card">
          <div class="card-title-row">
            <div>
              <h2 class="card-title">Summary</h2>
              <p class="card-subtitle">Current overview for care and support.</p>
            </div>
          </div>
          <div class="row-meta">${esc(data.summary_risk || data.summary || "No summary recorded.")}</div>
        </div>

        <div class="card">
          <div class="card-title-row">
            <div>
              <h2 class="card-title">Key details</h2>
              <p class="card-subtitle">Core information for staff awareness.</p>
            </div>
          </div>
          <div class="list">
            <div class="row-card">
              <div class="row-title">Legal status</div>
              <div class="row-meta">${esc(data.legal_status || state.selected.legal_status || "—")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">Placement type</div>
              <div class="row-meta">${esc(data.placement_type || state.selected.placement_type || "—")}</div>
            </div>
            <div class="row-card">
              <div class="row-title">Risk level</div>
              <div class="row-meta">${esc(data.risk_level || state.selected.risk_level || "—")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    $("overviewContent").innerHTML = `<div class="muted">Unable to load overview</div>`;
    showStatus("Could not load overview.", true);
  }
}

/* =========================
   TIMELINE
========================= */
async function loadTimeline() {
  if (!state.selected) return;

  const filter = $("timelineEventType")?.value || "";

  try {
    const requests = [
      { key: "daily_note", label: "Daily note", fetcher: () => api(ROUTES.dailyNotes(state.selected.id)) },
      { key: "incident", label: "Incident", fetcher: () => api(ROUTES.incidents(state.selected.id)) },
      { key: "health", label: "Health", fetcher: () => api(ROUTES.health(state.selected.id)) },
      { key: "education", label: "Education", fetcher: () => api(ROUTES.education(state.selected.id)) },
      { key: "family", label: "Family", fetcher: () => api(ROUTES.family(state.selected.id)) },
      { key: "keywork", label: "Key work", fetcher: () => api(ROUTES.keywork(state.selected.id)) },
      { key: "plan", label: "Plan", fetcher: () => api(ROUTES.plans(state.selected.id)) },
    ];

    const filteredRequests = filter
      ? requests.filter((item) => item.key === filter)
      : requests;

    const results = await Promise.all(
      filteredRequests.map(async (item) => {
        try {
          const rows = arr(await item.fetcher());
          return rows.map((row) => ({
            type: item.label,
            title: row.title || item.label,
            created_at: row.created_at || row.updated_at || row.date,
            summary: row.summary || row.detail || row.description || "",
          }));
        } catch {
          return [];
        }
      })
    );

    const timeline = results
      .flat()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    $("timelineContent").innerHTML = timeline.length
      ? timeline
          .map(
            (item) => `
              <div class="row-card">
                <div class="row-title">${esc(item.title)}</div>
                <div class="row-meta">${esc(item.type)} • ${fmtDateTime(item.created_at)}</div>
                <div class="row-meta">${esc(item.summary)}</div>
              </div>
            `
          )
          .join("")
      : `<div class="muted">No timeline items</div>`;
  } catch (error) {
    console.error(error);
    $("timelineContent").innerHTML = `<div class="muted">Unable to load timeline</div>`;
    showStatus("Could not load timeline.", true);
  }
}

/* =========================
   COLLECTION LOADERS
========================= */
async function loadDailyNotes() {
  await loadCollection({
    url: ROUTES.dailyNotes(state.selected.id),
    target: "dailyNotesContent",
    type: "Daily Note",
  });
}

async function loadIncidents() {
  await loadCollection({
    url: ROUTES.incidents(state.selected.id),
    target: "incidentsContent",
    type: "Incident",
  });
}

async function loadHealth() {
  await loadCollection({
    url: ROUTES.health(state.selected.id),
    target: "healthContent",
    type: "Health",
  });
}

async function loadEducation() {
  await loadCollection({
    url: ROUTES.education(state.selected.id),
    target: "educationContent",
    type: "Education",
  });
}

async function loadFamily() {
  await loadCollection({
    url: ROUTES.family(state.selected.id),
    target: "familyContent",
    type: "Family",
  });
}

async function loadKeywork() {
  await loadCollection({
    url: ROUTES.keywork(state.selected.id),
    target: "keyworkContent",
    type: "Keywork",
  });
}

async function loadPlans() {
  await loadCollection({
    url: ROUTES.plans(state.selected.id),
    target: "plansContent",
    type: "Plan",
  });
}

async function loadReviews() {
  await loadCollection({
    url: ROUTES.reviews(state.selected.id),
    target: "reviewsContent",
    type: "Review",
  });
}

async function loadArchive() {
  $("archiveContent").innerHTML = `<div class="muted">Archive not yet connected.</div>`;
}

async function loadCollection({ url, target, type }) {
  if (!state.selected) return;

  try {
    const rows = arr(await api(url));
    renderCollection(target, rows, type);
  } catch (error) {
    console.error(error);
    $(target).innerHTML = `<div class="muted">Unable to load ${type.toLowerCase()}s</div>`;
    showStatus(`Could not load ${type.toLowerCase()}s.`, true);
  }
}

function renderCollection(target, rows, type) {
  if (!rows.length) {
    $(target).innerHTML = `<div class="muted">No ${type.toLowerCase()}s</div>`;
    return;
  }

  $(target).innerHTML = rows
    .map(
      (row, index) => `
        <div class="row-card open-record" data-index="${index}">
          <div class="row-title">${esc(row.title || type)}</div>
          <div class="row-meta">${fmtDateTime(row.created_at || row.updated_at || row.date)}</div>
          <div class="row-meta">${esc(row.summary || row.detail || row.description || "")}</div>
        </div>
      `
    )
    .join("");

  $$(`#${target} .open-record`).forEach((el) => {
    el.onclick = () => {
      const row = rows[Number(el.dataset.index)];

      openModal(
        row.title || type,
        `${type} • ${fmtDateTime(row.created_at || row.updated_at || row.date)}`,
        `
          <div class="card">
            <label class="label">Notes</label>
            <textarea class="textarea">${esc(row.notes || row.summary || row.detail || row.description || "")}</textarea>
            <div style="height:12px;"></div>
            <button class="btn primary" type="button">Save</button>
          </div>
        `
      );
    };
  });
}

/* =========================
   HANDOVER / QA
========================= */
async function loadHandover() {
  try {
    const data = await api("/handover");
    const rows = arr(data);
    $("handoverBoard").innerHTML = renderRows(rows, "Handover");
  } catch (error) {
    console.error(error);
    $("handoverBoard").innerHTML = `<div class="muted">Unable to load handover</div>`;
  }
}

async function loadManagerQA() {
  try {
    const data = await api("/manager-qa");
    $("managerQaContent").innerHTML = renderRows(arr(data), "Review");
  } catch (error) {
    console.error(error);
    $("managerQaContent").innerHTML = `<div class="muted">Unable to load manager QA</div>`;
  }
}

/* =========================
   CREATE ACTIONS
========================= */
function openNew(type) {
  openModal(
    `New ${type}`,
    "Create record",
    `
      <div class="card">
        <label class="label">Details</label>
        <textarea class="textarea"></textarea>
        <div style="height:12px;"></div>
        <button class="btn primary" type="button">Save</button>
      </div>
    `
  );
}

/* =========================
   FAB
========================= */
function toggleFab() {
  $("fabMenu").classList.toggle("hidden");
}

function closeFab() {
  $("fabMenu").classList.add("hidden");
}

/* =========================
   EVENTS
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  $("modalCloseBtn").onclick = closeModal;
  $("modalCloseOverlay").onclick = closeModal;

  $("fabBtn").onclick = toggleFab;

  $("fabDailyBtn").onclick = () => openNew("Daily note");
  $("fabIncidentBtn").onclick = () => openNew("Incident");
  $("fabHealthBtn").onclick = () => openNew("Health");
  $("fabFamilyBtn").onclick = () => openNew("Family contact");
  $("fabKeyworkBtn").onclick = () => openNew("Keywork");
  $("fabPlanBtn").onclick = () => openNew("Plan");

  $("quickTimelineBtn").onclick = () => {
    setSection("young-people");
    setTab("timeline");
  };

  $("headerTimelineBtn").onclick = () => {
    setSection("young-people");
    setTab("timeline");
  };

  $("quickDailyNoteBtn").onclick = () => openNew("Daily note");
  $("quickIncidentBtn").onclick = () => openNew("Incident");
  $("quickPlanBtn").onclick = () => openNew("Plan");
  $("headerPlanBtn").onclick = () => openNew("Plan");
  $("timelineNewDailyBtn").onclick = () => openNew("Daily note");
  $("timelineNewIncidentBtn").onclick = () => openNew("Incident");
  $("plansOpenCreateBtn").onclick = () => openNew("Plan");

  $("timelineEventType").onchange = loadTimeline;

  $$(".nav-btn").forEach((btn) => {
    btn.onclick = () => setSection(btn.dataset.section);
  });

  $$(".tab").forEach((btn) => {
    btn.onclick = () => setTab(btn.dataset.tab);
  });

  $("youngPersonSelect").onchange = (event) => {
    state.selected = state.youngPeople.find((person) => String(person.id) === String(event.target.value)) || null;
    renderYoungPersonHero();
    updateHeader();
    loadCurrentTab();
  };

  document.addEventListener("click", (event) => {
    const insideFab = event.target.closest("#fabBtn") || event.target.closest("#fabMenu");
    if (!insideFab) closeFab();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeFab();
    }
  });

  setWelcome("Sarah");
  updateHeader();
  await loadYoungPeople();
  await loadCommandCentre();
});
