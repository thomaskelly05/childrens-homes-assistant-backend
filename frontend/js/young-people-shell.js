const ENDPOINTS = {
  listYoungPeople: "/young-people/",
  getYoungPersonProfile: (id) => `/young-people/${id}/profile`,

  getDailyNotes: (id) => `/young-people/${id}/daily-notes`,
  getArchivedDailyNotes: (id) => `/young-people/${id}/daily-notes/archive`,
  createDailyNote: "/young-people/daily-notes",
  submitDailyNote: (id) => `/young-people/daily-notes/${id}/submit`,
  approveDailyNote: (id) => `/young-people/daily-notes/${id}/approve`,
  returnDailyNote: (id) => `/young-people/daily-notes/${id}/return`,
  archiveDailyNote: (id) => `/young-people/daily-notes/${id}/archive`,

  getIncidents: (id) => `/young-people/${id}/incidents`,
  getArchivedIncidents: (id) => `/young-people/${id}/incidents/archive`,
  createIncident: "/young-people/incidents",
  submitIncident: (id) => `/young-people/incidents/${id}/submit`,
  approveIncident: (id) => `/young-people/incidents/${id}/approve`,
  returnIncident: (id) => `/young-people/incidents/${id}/return`,
  archiveIncident: (id) => `/young-people/incidents/${id}/archive`,

  getHandover: (id) => `/young-people/${id}/handover`,
  generateHandover: (id) => `/young-people/${id}/handover/generate`,
  approveHandover: (id) => `/young-people/handover/${id}/approve`,
  archiveHandover: (id) => `/young-people/handover/${id}/archive`,

  aiGenerate: "/ai-notes/generate",
  aiSave: "/ai-notes/save",
};

let youngPeopleCache = [];
let selectedYoungPersonId = null;
let selectedProfile = null;
let latestSafeguardingFlag = false;
let latestSafeguardingReason = "";

let currentDailyNotes = [];
let currentIncidents = [];
let currentHandover = [];
let currentArchivedDailyNotes = [];
let currentArchivedIncidents = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fullName(person) {
  const first = person?.first_name || "";
  const last = person?.last_name || "";
  return `${first} ${last}`.trim() || "Unnamed young person";
}

function preferredDisplayName(person) {
  return person?.preferred_name?.trim() || fullName(person);
}

function initials(person) {
  const first = person?.first_name?.[0] || "";
  const last = person?.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "YP";
}

function riskBadgeClass(value) {
  const v = (value || "").toString().toLowerCase();
  if (v.includes("high") || v.includes("critical")) return "badge-danger";
  if (v.includes("medium") || v.includes("submitted") || v.includes("pending")) return "badge-warning";
  if (v.includes("low") || v.includes("approved") || v.includes("reviewed")) return "badge-success";
  return "badge-neutral";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" ? data.detail || "Request failed" : data;
    throw new Error(message);
  }

  return data;
}

function setLoading(id, text = "Loading...") {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="loading">${escapeHtml(text)}</div>`;
}

function setError(id, text = "Something went wrong") {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="error-state">${escapeHtml(text)}</div>`;
}

function setStatus(id, text, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isError ? "#991b1b" : "#6b7280";
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function populateYoungPersonSelects(items) {
  const selects = [
    document.getElementById("aiYoungPerson"),
    document.getElementById("dailyYoungPerson"),
    document.getElementById("incidentYoungPerson"),
  ].filter(Boolean);

  const options = items.map((yp) => {
    return `<option value="${yp.id}">${escapeHtml(fullName(yp))}</option>`;
  }).join("");

  selects.forEach((select) => {
    select.innerHTML = options;
    if (selectedYoungPersonId) select.value = String(selectedYoungPersonId);
  });
}

function filterYoungPeople(query) {
  const value = query.trim().toLowerCase();
  if (!value) return youngPeopleCache;

  return youngPeopleCache.filter((yp) => {
    const text = [
      yp.first_name,
      yp.last_name,
      yp.placement_status,
      yp.summary_risk_level,
      yp.primary_keyworker_first_name,
      yp.primary_keyworker_last_name,
    ].filter(Boolean).join(" ").toLowerCase();

    return text.includes(value);
  });
}

function renderYoungPeopleList(items) {
  const container = document.getElementById("youngPeopleList");

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  container.innerHTML = items.map((yp) => {
    const activeClass = selectedYoungPersonId === yp.id ? "active" : "";
    return `
      <article class="yp-card ${activeClass}" data-id="${yp.id}">
        <div class="yp-name-row">
          <div class="yp-name">${escapeHtml(fullName(yp))}</div>
          <span class="badge ${riskBadgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk")}</span>
        </div>
        <div class="yp-sub">${escapeHtml(yp.placement_status || "Placement not set")}</div>
      </article>
    `;
  }).join("");

  container.querySelectorAll(".yp-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectYoungPerson(Number(card.dataset.id));
    });
  });
}

function renderHero(profile) {
  const yp = profile?.young_person;
  if (!yp) {
    document.getElementById("heroAvatar").textContent = "OS";
    document.getElementById("heroTitle").textContent = "Children's Home Operating System";
    document.getElementById("heroDescription").textContent = "Select a young person to begin working.";
    document.getElementById("heroBadges").innerHTML = "";
    return;
  }

  const keyworker =
    `${yp.primary_keyworker_first_name || ""} ${yp.primary_keyworker_last_name || ""}`.trim() || "Not assigned";

  document.getElementById("heroAvatar").textContent = initials(yp);
  document.getElementById("heroTitle").textContent = preferredDisplayName(yp);
  document.getElementById("heroDescription").textContent =
    `Age ${calculateAge(yp.date_of_birth)} • ${yp.placement_status || "Placement not set"} • Keyworker: ${keyworker}`;

  document.getElementById("heroBadges").innerHTML = `
    <span class="badge ${riskBadgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk set")}</span>
    <span class="badge badge-neutral">${escapeHtml(yp.gender || "Gender not set")}</span>
    <span class="badge badge-neutral">${escapeHtml(yp.ethnicity || "Ethnicity not set")}</span>
  `;
}

function renderProfile(profileData) {
  const yp = profileData?.young_person;
  const profilePanel = document.getElementById("profilePanel");
  const sideProfilePanel = document.getElementById("sideProfilePanel");

  if (!yp) {
    profilePanel.innerHTML = `<div class="empty-state">Profile not available.</div>`;
    sideProfilePanel.innerHTML = `<div class="empty-state">No detail available.</div>`;
    return;
  }

  const legalStatus = Array.isArray(profileData.legal_status) ? profileData.legal_status : [];
  const communicationProfile = Array.isArray(profileData.communication_profile) ? profileData.communication_profile : [];
  const identityProfile = Array.isArray(profileData.identity_profile) ? profileData.identity_profile : [];
  const alerts = Array.isArray(profileData.alerts) ? profileData.alerts : [];

  const latestCommunication = communicationProfile[0];
  const latestIdentity = identityProfile[0];

  profilePanel.innerHTML = `
    <div class="kv">
      <div class="kv-label">Full name</div><div>${escapeHtml(fullName(yp))}</div>
      <div class="kv-label">Preferred name</div><div>${escapeHtml(preferredDisplayName(yp))}</div>
      <div class="kv-label">Date of birth</div><div>${escapeHtml(formatDate(yp.date_of_birth))}</div>
      <div class="kv-label">Age</div><div>${escapeHtml(calculateAge(yp.date_of_birth))}</div>
      <div class="kv-label">Gender</div><div>${escapeHtml(yp.gender || "—")}</div>
      <div class="kv-label">Ethnicity</div><div>${escapeHtml(yp.ethnicity || "—")}</div>
      <div class="kv-label">NHS number</div><div>${escapeHtml(yp.nhs_number || "—")}</div>
      <div class="kv-label">Local ID</div><div>${escapeHtml(yp.local_id_number || "—")}</div>
      <div class="kv-label">Admission date</div><div>${escapeHtml(formatDate(yp.admission_date))}</div>
      <div class="kv-label">Discharge date</div><div>${escapeHtml(formatDate(yp.discharge_date))}</div>
      <div class="kv-label">Placement status</div><div>${escapeHtml(yp.placement_status || "—")}</div>
    </div>

    <div class="section-block">
      <h4>Legal Status</h4>
      ${
        legalStatus.length
          ? legalStatus.map((item) => `
            <div class="simple-item">
              <strong>${escapeHtml(item.status || item.legal_status || "Legal status")}</strong><br>
              Effective from: ${escapeHtml(formatDate(item.effective_from))}
            </div>
          `).join("")
          : `<div class="empty-state">No legal status recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Communication Profile</h4>
      ${
        latestCommunication
          ? `
            <div class="simple-item">
              <strong>Communication style</strong><br>
              ${escapeHtml(latestCommunication.communication_style || "—")}
              <br><br>
              <strong>Sensory profile</strong><br>
              ${escapeHtml(latestCommunication.sensory_profile || "—")}
            </div>
          `
          : `<div class="empty-state">No communication profile recorded.</div>`
      }
    </div>
  `;

  sideProfilePanel.innerHTML = `
    <div class="section-block">
      <h4>Alerts</h4>
      ${
        alerts.length
          ? alerts.map((alert) => `
            <div class="alert-item">
              <strong>${escapeHtml(alert.title || alert.alert_type || "Alert")}</strong><br>
              ${escapeHtml(alert.description || alert.summary || "")}
            </div>
          `).join("")
          : `<div class="empty-state">No alerts recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Identity Profile</h4>
      ${
        latestIdentity
          ? `
            <div class="simple-item">
              <strong>Interests</strong><br>
              ${escapeHtml(latestIdentity.interests || "—")}
              <br><br>
              <strong>Strengths summary</strong><br>
              ${escapeHtml(latestIdentity.strengths_summary || "—")}
              <br><br>
              <strong>What matters to me</strong><br>
              ${escapeHtml(latestIdentity.what_matters_to_me || "—")}
            </div>
          `
          : `<div class="empty-state">No identity profile recorded.</div>`
      }
    </div>
  `;
}

function renderDailyNotes(items) {
  const panel = document.getElementById("dailyNotesPanel");

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state">No daily notes found.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="record-list">
      ${items.map((note) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(note.title || "Daily note")}</div>
              <div class="record-meta">
                ${escapeHtml(formatDate(note.note_date))} • ${escapeHtml(note.shift_type || "shift")} • ${escapeHtml(note.author_name || "No author")}
              </div>
            </div>
            <span class="badge ${riskBadgeClass(note.workflow_status)}">${escapeHtml(note.workflow_status || "draft")}</span>
          </div>
          <div class="record-body">${escapeHtml(note.summary || "Daily note recorded")}</div>
          <div class="record-actions">
            <button class="secondary-btn" onclick="submitDailyNoteAction(${note.id})">Submit</button>
            <button class="primary-btn" onclick="approveDailyNoteAction(${note.id})">Approve</button>
            <button class="secondary-btn" onclick="returnDailyNoteAction(${note.id})">Return</button>
            <button class="danger-btn" onclick="archiveDailyNoteAction(${note.id})">Archive</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderIncidents(items) {
  const panel = document.getElementById("incidentsPanel");

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state">No incidents found.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="record-list">
      ${items.map((incident) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(incident.title || "Incident")}</div>
              <div class="record-meta">
                ${escapeHtml(formatDateTime(incident.occurred_at))} • ${escapeHtml(incident.location || "Location not set")}
              </div>
            </div>
            <span class="badge ${riskBadgeClass(incident.severity)}">${escapeHtml(incident.severity || "medium")}</span>
          </div>
          <div class="record-body">${escapeHtml(incident.description || "No description recorded")}</div>
          <div class="record-actions">
            <button class="secondary-btn" onclick="submitIncidentAction(${incident.id})">Submit</button>
            <button class="primary-btn" onclick="approveIncidentAction(${incident.id})">Approve</button>
            <button class="secondary-btn" onclick="returnIncidentAction(${incident.id})">Return</button>
            <button class="danger-btn" onclick="archiveIncidentAction(${incident.id})">Archive</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHandover(items) {
  const panel = document.getElementById("handoverPanel");

  if (!items.length) {
    panel.innerHTML = `<div class="empty-state">No handover records found.</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="record-list">
      ${items.map((handover) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(handover.title || "Shift Handover")}</div>
              <div class="record-meta">
                ${escapeHtml(formatDate(handover.handover_date))} • ${escapeHtml(handover.shift_type || "day")} • ${escapeHtml(handover.status || "draft")}
              </div>
            </div>
            <span class="badge ${riskBadgeClass(handover.status)}">${escapeHtml(handover.status || "draft")}</span>
          </div>
          <div class="record-body">${escapeHtml(handover.summary_text || "No summary text")}</div>
          <div class="record-actions">
            <button class="primary-btn" onclick="approveHandoverAction(${handover.id})">Approve</button>
            <button class="danger-btn" onclick="archiveHandoverAction(${handover.id})">Archive</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderArchive() {
  const panel = document.getElementById("archivePanel");

  const daily = currentArchivedDailyNotes || [];
  const incidents = currentArchivedIncidents || [];

  panel.innerHTML = `
    <div class="record-list">
      <div class="dashboard-card">
        <strong>Archived Daily Notes</strong><br>
        ${daily.length} archived
      </div>
      ${
        daily.length
          ? daily.map((note) => `
            <div class="record-card">
              <div class="record-card-header">
                <div>
                  <div class="record-title">${escapeHtml(note.title || "Daily note")}</div>
                  <div class="record-meta">${escapeHtml(formatDate(note.note_date))}</div>
                </div>
                <span class="badge badge-neutral">${escapeHtml(note.workflow_status || "archived")}</span>
              </div>
              <div class="record-body">${escapeHtml(note.summary || "Daily note recorded")}</div>
            </div>
          `).join("")
          : `<div class="empty-state">No archived daily notes.</div>`
      }

      <div class="dashboard-card">
        <strong>Archived Incidents</strong><br>
        ${incidents.length} archived
      </div>
      ${
        incidents.length
          ? incidents.map((incident) => `
            <div class="record-card">
              <div class="record-card-header">
                <div>
                  <div class="record-title">${escapeHtml(incident.title || "Incident")}</div>
                  <div class="record-meta">${escapeHtml(formatDateTime(incident.occurred_at))}</div>
                </div>
                <span class="badge badge-neutral">${escapeHtml(incident.workflow_status || "archived")}</span>
              </div>
              <div class="record-body">${escapeHtml(incident.description || "No description recorded")}</div>
            </div>
          `).join("")
          : `<div class="empty-state">No archived incidents.</div>`
      }
    </div>
  `;
}

function renderManagementQueue() {
  const panel = document.getElementById("managementPanel");

  const submittedNotes = currentDailyNotes.filter((x) => ["submitted"].includes((x.workflow_status || "").toLowerCase()));
  const returnedNotes = currentDailyNotes.filter((x) => ["returned"].includes((x.workflow_status || "").toLowerCase()));

  const submittedIncidents = currentIncidents.filter((x) => ["submitted"].includes((x.workflow_status || "").toLowerCase()));
  const returnedIncidents = currentIncidents.filter((x) => ["returned"].includes((x.workflow_status || "").toLowerCase()));

  const handoverDrafts = currentHandover.filter((x) => ["draft"].includes((x.status || "").toLowerCase()));

  panel.innerHTML = `
    <div class="record-list">
      <div class="dashboard-card">
        <strong>Daily Notes Awaiting Review</strong><br>
        ${submittedNotes.length} submitted • ${returnedNotes.length} returned
      </div>

      ${submittedNotes.map((note) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(note.title || "Daily note")}</div>
              <div class="record-meta">${escapeHtml(formatDate(note.note_date))}</div>
            </div>
            <span class="badge badge-warning">${escapeHtml(note.workflow_status || "submitted")}</span>
          </div>
          <div class="record-body">${escapeHtml(note.summary || "Daily note recorded")}</div>
          <div class="record-actions">
            <button class="primary-btn" onclick="approveDailyNoteAction(${note.id})">Approve</button>
            <button class="secondary-btn" onclick="returnDailyNoteAction(${note.id})">Return</button>
            <button class="danger-btn" onclick="archiveDailyNoteAction(${note.id})">Archive</button>
          </div>
        </div>
      `).join("")}

      <div class="dashboard-card">
        <strong>Incidents Awaiting Review</strong><br>
        ${submittedIncidents.length} submitted • ${returnedIncidents.length} returned
      </div>

      ${submittedIncidents.map((incident) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(incident.title || "Incident")}</div>
              <div class="record-meta">${escapeHtml(formatDateTime(incident.occurred_at))}</div>
            </div>
            <span class="badge badge-warning">${escapeHtml(incident.workflow_status || "submitted")}</span>
          </div>
          <div class="record-body">${escapeHtml(incident.description || "No description recorded")}</div>
          <div class="record-actions">
            <button class="primary-btn" onclick="approveIncidentAction(${incident.id})">Approve</button>
            <button class="secondary-btn" onclick="returnIncidentAction(${incident.id})">Return</button>
            <button class="danger-btn" onclick="archiveIncidentAction(${incident.id})">Archive</button>
          </div>
        </div>
      `).join("")}

      <div class="dashboard-card">
        <strong>Handover Awaiting Sign-off</strong><br>
        ${handoverDrafts.length} draft
      </div>

      ${handoverDrafts.map((handover) => `
        <div class="record-card">
          <div class="record-card-header">
            <div>
              <div class="record-title">${escapeHtml(handover.title || "Shift Handover")}</div>
              <div class="record-meta">${escapeHtml(formatDate(handover.handover_date))}</div>
            </div>
            <span class="badge badge-warning">${escapeHtml(handover.status || "draft")}</span>
          </div>
          <div class="record-body">${escapeHtml(handover.summary_text || "No summary text")}</div>
          <div class="record-actions">
            <button class="primary-btn" onclick="approveHandoverAction(${handover.id})">Approve</button>
            <button class="danger-btn" onclick="archiveHandoverAction(${handover.id})">Archive</button>
          </div>
        </div>
      `).join("")}

      ${
        !submittedNotes.length && !submittedIncidents.length && !handoverDrafts.length
          ? `<div class="empty-state">No items currently waiting for management sign-off.</div>`
          : ""
      }
    </div>
  `;

  document.getElementById("dashboardQueue").innerHTML = `
    <div class="record-list">
      <div class="dashboard-card"><strong>Submitted Daily Notes</strong><br>${submittedNotes.length}</div>
      <div class="dashboard-card"><strong>Submitted Incidents</strong><br>${submittedIncidents.length}</div>
      <div class="dashboard-card"><strong>Draft Handovers</strong><br>${handoverDrafts.length}</div>
    </div>
  `;
}

function renderDashboardOverview() {
  const container = document.getElementById("dashboardOverview");

  const ypCount = youngPeopleCache.length;
  const notesCount = currentDailyNotes.length;
  const incidentsCount = currentIncidents.length;
  const handoverCount = currentHandover.length;

  const selectedYP = youngPeopleCache.find((yp) => yp.id === selectedYoungPersonId);

  container.innerHTML = `
    <div class="record-list">
      <div class="dashboard-card">
        <strong>Young People</strong><br>
        ${ypCount} active
      </div>
      <div class="dashboard-card">
        <strong>Current Daily Notes</strong><br>
        ${notesCount}
      </div>
      <div class="dashboard-card">
        <strong>Current Incidents</strong><br>
        ${incidentsCount}
      </div>
      <div class="dashboard-card">
        <strong>Handover Records</strong><br>
        ${handoverCount}
      </div>
      <div class="dashboard-card">
        <strong>Selected Young Person</strong><br>
        ${selectedYP ? escapeHtml(fullName(selectedYP)) : "None selected"}
      </div>
    </div>
  `;
}

async function loadYoungPeople() {
  setLoading("youngPeopleList", "Loading young people...");
  try {
    const data = await fetchJson(ENDPOINTS.listYoungPeople);
    youngPeopleCache = Array.isArray(data?.items) ? data.items : [];
    renderYoungPeopleList(youngPeopleCache);
    populateYoungPersonSelects(youngPeopleCache);
    renderDashboardOverview();

    if (youngPeopleCache.length && !selectedYoungPersonId) {
      await selectYoungPerson(youngPeopleCache[0].id);
    }
  } catch (error) {
    setError("youngPeopleList", error.message || "Unable to load young people.");
  }
}

async function selectYoungPerson(id) {
  selectedYoungPersonId = id;
  renderYoungPeopleList(filterYoungPeople(document.getElementById("youngPeopleSearch").value));
  populateYoungPersonSelects(youngPeopleCache);

  setLoading("profilePanel", "Loading profile...");
  setLoading("sideProfilePanel", "Loading profile...");
  setLoading("dailyNotesPanel", "Loading daily notes...");
  setLoading("incidentsPanel", "Loading incidents...");
  setLoading("handoverPanel", "Loading handover...");
  setLoading("archivePanel", "Loading archive...");
  setLoading("managementPanel", "Loading management queue...");

  try {
    const [
      profileData,
      dailyNotes,
      incidents,
      handover,
      archivedDailyNotes,
      archivedIncidents
    ] = await Promise.all([
      fetchJson(ENDPOINTS.getYoungPersonProfile(id)),
      fetchJson(ENDPOINTS.getDailyNotes(id)),
      fetchJson(ENDPOINTS.getIncidents(id)),
      fetchJson(ENDPOINTS.getHandover(id)),
      fetchJson(ENDPOINTS.getArchivedDailyNotes(id)),
      fetchJson(ENDPOINTS.getArchivedIncidents(id)),
    ]);

    selectedProfile = profileData;
    currentDailyNotes = Array.isArray(dailyNotes?.items) ? dailyNotes.items : [];
    currentIncidents = Array.isArray(incidents?.items) ? incidents.items : [];
    currentHandover = Array.isArray(handover) ? handover : [];
    currentArchivedDailyNotes = Array.isArray(archivedDailyNotes?.items) ? archivedDailyNotes.items : [];
    currentArchivedIncidents = Array.isArray(archivedIncidents?.items) ? archivedIncidents.items : [];

    renderHero(profileData);
    renderProfile(profileData);
    renderDailyNotes(currentDailyNotes);
    renderIncidents(currentIncidents);
    renderHandover(currentHandover);
    renderArchive();
    renderManagementQueue();
    renderDashboardOverview();
  } catch (error) {
    setError("profilePanel", error.message || "Unable to load records.");
    setError("sideProfilePanel", error.message || "Unable to load records.");
    setError("dailyNotesPanel", error.message || "Unable to load daily notes.");
    setError("incidentsPanel", error.message || "Unable to load incidents.");
    setError("handoverPanel", error.message || "Unable to load handover.");
    setError("archivePanel", error.message || "Unable to load archive.");
    setError("managementPanel", error.message || "Unable to load management queue.");
  }
}

async function reloadSelectedYoungPerson() {
  if (selectedYoungPersonId) {
    await selectYoungPerson(selectedYoungPersonId);
  } else {
    await loadYoungPeople();
  }
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function openAiModal() {
  populateYoungPersonSelects(youngPeopleCache);
  if (selectedYoungPersonId) document.getElementById("aiYoungPerson").value = String(selectedYoungPersonId);
  document.getElementById("aiRecordDate").value = new Date().toISOString().slice(0, 10);
  openModal("aiNoteModal");
}

function openDailyModal() {
  populateYoungPersonSelects(youngPeopleCache);
  if (selectedYoungPersonId) document.getElementById("dailyYoungPerson").value = String(selectedYoungPersonId);
  document.getElementById("dailyNoteDate").value = new Date().toISOString().slice(0, 10);
  openModal("dailyNoteModal");
}

function openIncidentModal() {
  populateYoungPersonSelects(youngPeopleCache);
  if (selectedYoungPersonId) document.getElementById("incidentYoungPerson").value = String(selectedYoungPersonId);
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById("incidentOccurredAt").value = local;
  openModal("incidentModal");
}

async function generateAiNote() {
  const transcript = document.getElementById("aiTranscript").value.trim();
  if (!transcript) {
    setStatus("aiStatus", "Please enter a raw note or transcript first.", true);
    return;
  }

  setStatus("aiStatus", "Generating AI note...");

  try {
    const formData = new FormData();
    formData.append("transcript", transcript);

    const data = await fetchJson(ENDPOINTS.aiGenerate, {
      method: "POST",
      body: formData,
    });

    document.getElementById("aiDraft").value = data.note || "";
    document.getElementById("aiFinalNote").value = data.note || "";
    latestSafeguardingFlag = !!data.safeguarding_flag;
    latestSafeguardingReason = data.safeguarding_reason || "";

    const banner = document.getElementById("aiSafeguardingBanner");
    if (latestSafeguardingFlag) {
      banner.classList.remove("hidden");
      banner.textContent = latestSafeguardingReason || "Potential safeguarding concern identified.";
    } else {
      banner.classList.add("hidden");
      banner.textContent = "";
    }

    setStatus("aiStatus", "AI note generated.");
  } catch (error) {
    setStatus("aiStatus", error.message || "Unable to generate AI note.", true);
  }
}

async function saveAiNote() {
  const transcript = document.getElementById("aiTranscript").value.trim();
  const aiDraft = document.getElementById("aiDraft").value.trim();
  const finalNote = document.getElementById("aiFinalNote").value.trim();
  const youngPersonId = document.getElementById("aiYoungPerson").value;
  const recordDate = document.getElementById("aiRecordDate").value;
  const shiftType = document.getElementById("aiShiftType").value.trim();
  const locationContext = document.getElementById("aiLocationContext").value.trim();

  if (!transcript || !aiDraft || !finalNote) {
    setStatus("aiStatus", "Transcript, AI draft and final note are required.", true);
    return;
  }

  const yp = youngPeopleCache.find((item) => String(item.id) === String(youngPersonId));
  const youngPersonName = yp ? fullName(yp) : "";

  setStatus("aiStatus", "Saving AI note...");

  try {
    const formData = new FormData();
    formData.append("transcript", transcript);
    formData.append("ai_draft", aiDraft);
    formData.append("final_note", finalNote);
    formData.append("safeguarding_flag", String(latestSafeguardingFlag));
    formData.append("safeguarding_reason", latestSafeguardingReason || "");
    formData.append("title", finalNote.split("\n").find(Boolean)?.slice(0, 100) || "AI Care Note");
    formData.append("template_name", "Young People Shell");
    formData.append("service_type", "Residential Care");
    formData.append("shift_type", shiftType);
    formData.append("record_author", "");
    formData.append("young_person_name", youngPersonName);
    formData.append("record_date", recordDate);
    formData.append("location_context", locationContext);

    await fetchJson(ENDPOINTS.aiSave, {
      method: "POST",
      body: formData,
    });

    setStatus("aiStatus", "AI note saved.");
    closeModal("aiNoteModal");
  } catch (error) {
    setStatus("aiStatus", error.message || "Unable to save AI note.", true);
  }
}

async function saveDailyNote() {
  const payload = {
    young_person_id: Number(document.getElementById("dailyYoungPerson").value),
    note_date: document.getElementById("dailyNoteDate").value,
    shift_type: document.getElementById("dailyShiftType").value.trim() || "day",
    mood: document.getElementById("dailyMood").value.trim(),
    presentation: document.getElementById("dailyPresentation").value.trim(),
    activities: document.getElementById("dailyActivities").value.trim(),
    education_update: document.getElementById("dailyEducation").value.trim(),
    health_update: document.getElementById("dailyHealth").value.trim(),
    family_update: document.getElementById("dailyFamily").value.trim(),
    behaviour_update: document.getElementById("dailyBehaviour").value.trim(),
    young_person_voice: document.getElementById("dailyVoice").value.trim(),
    positives: document.getElementById("dailyPositives").value.trim(),
    actions_required: document.getElementById("dailyActions").value.trim(),
    workflow_status: "draft",
  };

  if (!payload.young_person_id || !payload.note_date || !payload.shift_type) {
    setStatus("dailyStatus", "Young person, note date and shift type are required.", true);
    return;
  }

  setStatus("dailyStatus", "Saving daily note...");

  try {
    await fetchJson(ENDPOINTS.createDailyNote, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus("dailyStatus", "Daily note saved.");
    closeModal("dailyNoteModal");
    await reloadSelectedYoungPerson();
    activateTab("daily-notes");
  } catch (error) {
    setStatus("dailyStatus", error.message || "Unable to save daily note.", true);
  }
}

async function saveIncident() {
  const occurredAt = document.getElementById("incidentOccurredAt").value;
  const payload = {
    young_person_id: Number(document.getElementById("incidentYoungPerson").value),
    occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
    incident_type: document.getElementById("incidentType").value,
    severity: document.getElementById("incidentSeverity").value,
    location: document.getElementById("incidentLocation").value.trim(),
    description: document.getElementById("incidentDescription").value.trim(),
    antecedent: document.getElementById("incidentAntecedent").value.trim(),
    presentation: document.getElementById("incidentPresentation").value.trim(),
    staff_response: document.getElementById("incidentStaffResponse").value.trim(),
    trauma_informed_formulation: document.getElementById("incidentFormulation").value.trim(),
    child_voice: document.getElementById("incidentVoice").value.trim(),
    restorative_follow_up: document.getElementById("incidentRestorative").value.trim(),
    staff_id: document.getElementById("incidentStaffId").value ? Number(document.getElementById("incidentStaffId").value) : null,
    manager_review_status: "draft",
  };

  if (!payload.young_person_id || !payload.description) {
    setStatus("incidentStatus", "Young person and description are required.", true);
    return;
  }

  setStatus("incidentStatus", "Saving incident...");

  try {
    await fetchJson(ENDPOINTS.createIncident, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus("incidentStatus", "Incident saved.");
    closeModal("incidentModal");
    await reloadSelectedYoungPerson();
    activateTab("incidents");
  } catch (error) {
    setStatus("incidentStatus", error.message || "Unable to save incident.", true);
  }
}

async function generateHandover() {
  if (!selectedYoungPersonId) return;
  setLoading("handoverPanel", "Generating handover...");
  try {
    await fetchJson(ENDPOINTS.generateHandover(selectedYoungPersonId), { method: "POST" });
    await reloadSelectedYoungPerson();
    activateTab("handover");
  } catch (error) {
    setError("handoverPanel", error.message || "Unable to generate handover.");
  }
}

async function submitDailyNoteAction(id) {
  await fetchJson(ENDPOINTS.submitDailyNote(id), { method: "POST" });
  await reloadSelectedYoungPerson();
}

async function approveDailyNoteAction(id) {
  await fetchJson(ENDPOINTS.approveDailyNote(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_note: "Approved in Young People Shell", approved_by: null }),
  });
  await reloadSelectedYoungPerson();
}

async function returnDailyNoteAction(id) {
  const review_note = window.prompt("Add a return comment:", "Please review and update this record.") || "";
  await fetchJson(ENDPOINTS.returnDailyNote(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_note }),
  });
  await reloadSelectedYoungPerson();
}

async function archiveDailyNoteAction(id) {
  await fetchJson(ENDPOINTS.archiveDailyNote(id), { method: "POST" });
  await reloadSelectedYoungPerson();
  activateTab("archive");
}

async function submitIncidentAction(id) {
  await fetchJson(ENDPOINTS.submitIncident(id), { method: "POST" });
  await reloadSelectedYoungPerson();
}

async function approveIncidentAction(id) {
  await fetchJson(ENDPOINTS.approveIncident(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_note: "Approved in Young People Shell", approved_by: null }),
  });
  await reloadSelectedYoungPerson();
}

async function returnIncidentAction(id) {
  const review_note = window.prompt("Add a return comment:", "Please review and update this incident.") || "";
  await fetchJson(ENDPOINTS.returnIncident(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review_note }),
  });
  await reloadSelectedYoungPerson();
}

async function archiveIncidentAction(id) {
  await fetchJson(ENDPOINTS.archiveIncident(id), { method: "POST" });
  await reloadSelectedYoungPerson();
  activateTab("archive");
}

async function approveHandoverAction(id) {
  await fetchJson(ENDPOINTS.approveHandover(id), { method: "PUT" });
  await reloadSelectedYoungPerson();
}

async function archiveHandoverAction(id) {
  await fetchJson(ENDPOINTS.archiveHandover(id), { method: "PUT" });
  await reloadSelectedYoungPerson();
  activateTab("archive");
}

function bindEvents() {
  document.getElementById("refreshBtn").addEventListener("click", reloadSelectedYoungPerson);

  document.getElementById("youngPeopleSearch").addEventListener("input", (e) => {
    renderYoungPeopleList(filterYoungPeople(e.target.value));
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  document.getElementById("openAiNoteBtn").addEventListener("click", openAiModal);
  document.getElementById("openDailyNoteBtn").addEventListener("click", openDailyModal);
  document.getElementById("openDailyNoteBtn2").addEventListener("click", openDailyModal);
  document.getElementById("openIncidentBtn").addEventListener("click", openIncidentModal);
  document.getElementById("openIncidentBtn2").addEventListener("click", openIncidentModal);
  document.getElementById("generateHandoverBtn").addEventListener("click", generateHandover);
  document.getElementById("generateHandoverBtn2").addEventListener("click", generateHandover);

  document.getElementById("generateAiBtn").addEventListener("click", generateAiNote);
  document.getElementById("saveAiBtn").addEventListener("click", saveAiNote);
  document.getElementById("copyDraftBtn").addEventListener("click", () => {
    document.getElementById("aiFinalNote").value = document.getElementById("aiDraft").value;
  });

  document.getElementById("saveDailyBtn").addEventListener("click", saveDailyNote);
  document.getElementById("saveIncidentBtn").addEventListener("click", saveIncident);

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
}

function init() {
  bindEvents();
  loadYoungPeople();
}

document.addEventListener("DOMContentLoaded", init);

// expose workflow actions for inline buttons
window.submitDailyNoteAction = submitDailyNoteAction;
window.approveDailyNoteAction = approveDailyNoteAction;
window.returnDailyNoteAction = returnDailyNoteAction;
window.archiveDailyNoteAction = archiveDailyNoteAction;

window.submitIncidentAction = submitIncidentAction;
window.approveIncidentAction = approveIncidentAction;
window.returnIncidentAction = returnIncidentAction;
window.archiveIncidentAction = archiveIncidentAction;

window.approveHandoverAction = approveHandoverAction;
window.archiveHandoverAction = archiveHandoverAction;
