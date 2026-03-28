const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "overview",
  selectorItems: [],
};

const els = {
  nav: document.getElementById("shellNav"),
  content: document.getElementById("viewContent"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  statusBar: document.getElementById("statusBar"),
  refreshBtn: document.getElementById("refreshBtn"),
  youngPersonName: document.getElementById("youngPersonName"),
  youngPersonMeta: document.getElementById("youngPersonMeta"),
  youngPersonAvatar: document.getElementById("youngPersonAvatar"),
  selectorPanel: document.getElementById("selectorPanel"),
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  selectorRefreshBtn: document.getElementById("selectorRefreshBtn"),
};

const VIEW_CONFIG = {
  overview: {
    title: "Overview",
    subtitle: "Young person summary and recent activity",
    loader: loadOverview,
  },
  "daily-notes": {
    title: "Daily Notes",
    subtitle: "Shift-based daily recording",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/daily-notes`, "Daily notes"),
  },
  incidents: {
    title: "Incidents",
    subtitle: "Behavioural and safeguarding incidents",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/incidents`, "Incidents"),
  },
  risk: {
    title: "Risk",
    subtitle: "Risk assessments and current concerns",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/risk`, "Risk assessments"),
  },
  plans: {
    title: "Plans",
    subtitle: "Support plans and planning documents",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/plans`, "Support plans"),
  },
  health: {
    title: "Health",
    subtitle: "Health profile, records, and medication",
    loader: loadHealth,
  },
  education: {
    title: "Education",
    subtitle: "Education profile and education records",
    loader: loadEducation,
  },
  family: {
    title: "Family",
    subtitle: "Contacts and family contact records",
    loader: loadFamily,
  },
  keywork: {
    title: "Keywork",
    subtitle: "Keywork sessions and follow-up",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork sessions"),
  },
};

function getYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? Number(id) : null;
}

async function apiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}

function showError(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function clearError() {
  els.statusBar.classList.add("hidden");
  els.statusBar.textContent = "";
}

function setLoading(message = "Loading workspace...") {
  els.content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function setEmpty(message = "No records found.") {
  els.content.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

function initialsFromName(name) {
  if (!name) return "YP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "YP";
}

function statusBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (["approved", "active", "recorded"].includes(value)) return "success";
  if (["submitted", "pending", "medium"].includes(value)) return "warning";
  if (["returned", "high", "critical", "archived"].includes(value)) return "danger";
  return "";
}

function renderBadges(values = []) {
  if (!values.length) return "";
  return `
    <div class="badge-row">
      ${values
        .filter(Boolean)
        .map(
          (value) =>
            `<span class="badge ${statusBadgeClass(value)}">${escapeHtml(value)}</span>`
        )
        .join("")}
    </div>
  `;
}

function renderRecordCard(item) {
  const title =
    item.title ||
    item.topic ||
    item.contact_person ||
    item.record_type ||
    "Record";

  const summary =
    item.summary ||
    item.narrative ||
    item.description ||
    "No summary available.";

  const metaBits = [
    item.occurred_at ? formatDate(item.occurred_at) : null,
    item.session_date ? formatDate(item.session_date) : null,
    item.worker_name || null,
    item.author_name || null,
    item.created_by_name || null,
    item.owner_name || null,
  ].filter(Boolean);

  const badges = [
    item.workflow_status,
    item.severity,
    item.status,
    item.approval_status,
  ].filter(Boolean);

  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <div class="meta">${escapeHtml(metaBits.join(" • ") || "Record")}</div>
        </div>
      </div>
      <div class="body">${escapeHtml(summary)}</div>
      ${renderBadges(badges)}
    </article>
  `;
}

function updateHeaderForView(viewKey) {
  const config = VIEW_CONFIG[viewKey];
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
}

function markActiveNav(viewKey) {
  const buttons = els.nav.querySelectorAll(".nav-item");
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewKey);
  });
}

function showSelectorMode() {
  els.selectorPanel.classList.remove("hidden");
  els.content.classList.add("hidden");
  els.refreshBtn.classList.add("hidden");
  els.pageTitle.textContent = "Select a young person";
  els.pageSubtitle.textContent = "Open a workspace to begin";
  els.youngPersonName.textContent = "No young person selected";
  els.youngPersonMeta.textContent = "Choose from the list";
  els.youngPersonAvatar.textContent = "YP";
}

function hideSelectorMode() {
  els.selectorPanel.classList.add("hidden");
  els.content.classList.remove("hidden");
  els.refreshBtn.classList.remove("hidden");
}

function openYoungPerson(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState({}, "", url.toString());

  state.youngPersonId = Number(id);
  state.currentView = "overview";

  hideSelectorMode();

  loadYoungPerson()
    .then(loadCurrentView)
    .catch((error) => {
      console.error(error);
      showError(error.message || "Failed to load young person.");
      setEmpty("Unable to load young person workspace.");
    });
}

function renderSelectorList(items) {
  if (!items.length) {
    els.selectorList.innerHTML = `<div class="selector-empty">No young people found.</div>`;
    return;
  }

  els.selectorList.innerHTML = items
    .map((item) => {
      const name =
        [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
        item.preferred_name ||
        "Young Person";

      const meta = [
        item.preferred_name ? `Preferred: ${item.preferred_name}` : null,
        item.placement_status || null,
        item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      return `
        <article class="selector-card">
          <div class="selector-card-left">
            <div class="selector-card-avatar">${escapeHtml(initialsFromName(name))}</div>
            <div>
              <h4>${escapeHtml(name)}</h4>
              <p>${escapeHtml(meta || "Young person record")}</p>
            </div>
          </div>
          <button class="primary-btn" data-open-young-person="${item.id}">Open</button>
        </article>
      `;
    })
    .join("");
}

function filterSelectorList() {
  const term = (els.selectorSearch.value || "").trim().toLowerCase();

  if (!term) {
    renderSelectorList(state.selectorItems);
    return;
  }

  const filtered = state.selectorItems.filter((item) => {
    const haystack = [
      item.first_name,
      item.last_name,
      item.preferred_name,
      item.placement_status,
      item.summary_risk_level,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderSelectorList(filtered);
}

async function loadYoungPersonSelector() {
  clearError();
  showSelectorMode();

  els.selectorList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading young people...</p>
    </div>
  `;

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young people.");
    els.selectorList.innerHTML = `<div class="selector-empty">Unable to load young people.</div>`;
  }
}

async function loadYoungPerson() {
  const result = await apiGet(`/young-people/${state.youngPersonId}`);
  const yp = result.young_person || result.bundle?.young_person || result;
  state.youngPerson = yp;

  const fullName =
    [yp.first_name, yp.last_name].filter(Boolean).join(" ").trim() ||
    yp.preferred_name ||
    "Young Person";

  const meta = [
    yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
    yp.placement_status || null,
    yp.summary_risk_level ? `Risk: ${yp.summary_risk_level}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  els.youngPersonName.textContent = fullName;
  els.youngPersonMeta.textContent = meta || "Young person record";
  els.youngPersonAvatar.textContent = initialsFromName(fullName);
}

async function loadOverview() {
  setLoading("Loading overview...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/overview`);

  const youngPerson = data.young_person || {};
  const overview = data.overview || {};
  const counts = data.dashboard_counts || overview.dashboard_counts || {};
  const alerts = data.alerts || overview.alerts || [];
  const recent = data.recent_activity || overview.recent_activity || [];

  els.content.innerHTML = `
    <div class="grid grid-3">
      <div class="stat-card">
        <div class="label">Placement status</div>
        <div class="value">${escapeHtml(youngPerson.placement_status || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="label">Risk level</div>
        <div class="value">${escapeHtml(youngPerson.summary_risk_level || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="label">Open alerts</div>
        <div class="value">${escapeHtml(String(alerts.length))}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Dashboard counts</h3>
      <div class="grid grid-3">
        ${
          Object.keys(counts).length
            ? Object.entries(counts)
                .map(
                  ([key, value]) => `
                    <div class="stat-card">
                      <div class="label">${escapeHtml(key.replaceAll("_", " "))}</div>
                      <div class="value">${escapeHtml(String(value))}</div>
                    </div>
                  `
                )
                .join("")
            : `<div class="empty-state">No dashboard counts returned.</div>`
        }
      </div>
    </div>

    <div class="panel">
      <h3>Active alerts</h3>
      ${
        alerts.length
          ? `<div class="record-list">${alerts
              .map(
                (alert) => `
                  <article class="record-card">
                    <div class="record-card-header">
                      <div>
                        <h4>${escapeHtml(alert.title || "Alert")}</h4>
                        <div class="meta">${escapeHtml(
                          alert.alert_type || "Alert"
                        )} • ${escapeHtml(alert.severity || "standard")}</div>
                      </div>
                    </div>
                    <div class="body">${escapeHtml(alert.description || "No description.")}</div>
                    ${renderBadges([alert.severity, alert.is_active ? "active" : "inactive"])}
                  </article>
                `
              )
              .join("")}</div>`
          : `<div class="empty-state">No active alerts.</div>`
      }
    </div>

    <div class="panel">
      <h3>Recent activity</h3>
      ${
        recent.length
          ? `<div class="record-list">${recent.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No recent activity.</div>`
      }
    </div>
  `;
}

async function loadRecordList(url, emptyLabel) {
  setLoading(`Loading ${emptyLabel.toLowerCase()}...`);

  const data = await apiGet(url);
  const items = data.items || data.timeline || data.records || [];

  if (!items.length) {
    setEmpty(`No ${emptyLabel.toLowerCase()} found.`);
    return;
  }

  els.content.innerHTML = `
    <div class="record-list">
      ${items.map(renderRecordCard).join("")}
    </div>
  `;
}

async function loadHealth() {
  setLoading("Loading health...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);

  const profile = data.health_profile || data.profile || {};
  const records = data.health_records || [];
  const medicationProfiles = data.medication_profiles || [];
  const medicationRecords = data.medication_records || [];

  els.content.innerHTML = `
    <div class="panel">
      <h3>Health profile</h3>
      <div class="kv">
        <div class="k">GP</div><div>${escapeHtml(profile.gp_name || "—")}</div>
        <div class="k">Allergies</div><div>${escapeHtml(profile.allergies || "—")}</div>
        <div class="k">Diagnoses</div><div>${escapeHtml(profile.diagnoses || "—")}</div>
        <div class="k">Mental health</div><div>${escapeHtml(profile.mental_health_summary || "—")}</div>
        <div class="k">Medication summary</div><div>${escapeHtml(profile.medication_summary || "—")}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Health records</h3>
      ${
        records.length
          ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No health records.</div>`
      }
    </div>

    <div class="panel">
      <h3>Medication profiles</h3>
      ${
        medicationProfiles.length
          ? `<div class="record-list">${medicationProfiles
              .map(
                (item) => `
                  <article class="record-card">
                    <h4>${escapeHtml(item.medication_name || "Medication")}</h4>
                    <div class="meta">${escapeHtml(item.dosage || "—")} • ${escapeHtml(
                      item.frequency || "—"
                    )}</div>
                    <div class="body">${escapeHtml(
                      item.notes || item.prn_guidance || "No notes."
                    )}</div>
                    ${renderBadges([item.is_active ? "active" : "inactive"])}
                  </article>
                `
              )
              .join("")}</div>`
          : `<div class="empty-state">No medication profiles.</div>`
      }
    </div>

    <div class="panel">
      <h3>Medication records</h3>
      ${
        medicationRecords.length
          ? `<div class="record-list">${medicationRecords.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No medication records.</div>`
      }
    </div>
  `;
}

async function loadEducation() {
  setLoading("Loading education...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);

  const profile = data.education_profile || data.profile || {};
  const records = data.education_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <h3>Education profile</h3>
      <div class="kv">
        <div class="k">School</div><div>${escapeHtml(profile.school_name || "—")}</div>
        <div class="k">Year group</div><div>${escapeHtml(profile.year_group || "—")}</div>
        <div class="k">Education status</div><div>${escapeHtml(profile.education_status || "—")}</div>
        <div class="k">SEN status</div><div>${escapeHtml(profile.sen_status || "—")}</div>
        <div class="k">Support summary</div><div>${escapeHtml(profile.support_summary || "—")}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Education records</h3>
      ${
        records.length
          ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No education records.</div>`
      }
    </div>
  `;
}

async function loadFamily() {
  setLoading("Loading family...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);

  const contacts = data.contacts || [];
  const records = data.family_contact_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <h3>Family contacts</h3>
      ${
        contacts.length
          ? `<div class="record-list">${contacts
              .map(
                (contact) => `
                  <article class="record-card">
                    <h4>${escapeHtml(contact.full_name || "Contact")}</h4>
                    <div class="meta">${escapeHtml(
                      contact.relationship_to_young_person || contact.contact_type || "Contact"
                    )}</div>
                    <div class="body">Phone: ${escapeHtml(contact.phone || "—")}
Email: ${escapeHtml(contact.email || "—")}
Notes: ${escapeHtml(contact.notes || "—")}</div>
                    ${renderBadges([
                      contact.is_parental_responsibility_holder ? "parental responsibility" : null,
                      contact.is_approved_contact ? "approved" : null,
                      contact.is_restricted_contact ? "restricted" : null,
                    ])}
                  </article>
                `
              )
              .join("")}</div>`
          : `<div class="empty-state">No family contacts.</div>`
      }
    </div>

    <div class="panel">
      <h3>Family contact records</h3>
      ${
        records.length
          ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>`
          : `<div class="empty-state">No family contact records.</div>`
      }
    </div>
  `;
}

async function loadCurrentView() {
  clearError();
  updateHeaderForView(state.currentView);
  markActiveNav(state.currentView);

  const config = VIEW_CONFIG[state.currentView];
  if (!config) {
    setEmpty("Unknown view.");
    return;
  }

  try {
    await config.loader();
  } catch (error) {
    console.error(error);
    showError(error.message || "Something went wrong.");
    setEmpty("Unable to load this workspace.");
  }
}

function bindEvents() {
  els.nav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-item");
    if (!button) return;

    if (!state.youngPersonId) {
      showError("Select a young person first.");
      return;
    }

    state.currentView = button.dataset.view;
    loadCurrentView();
  });

  els.refreshBtn.addEventListener("click", () => {
    if (!state.youngPersonId) {
      loadYoungPersonSelector();
      return;
    }

    loadYoungPerson()
      .then(loadCurrentView)
      .catch((error) => {
        console.error(error);
        showError(error.message || "Failed to refresh.");
      });
  });

  els.selectorRefreshBtn.addEventListener("click", () => {
    loadYoungPersonSelector();
  });

  els.selectorSearch.addEventListener("input", () => {
    filterSelectorList();
  });

  els.selectorList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-young-person]");
    if (!button) return;

    const id = Number(button.dataset.openYoungPerson);
    if (!id) return;

    openYoungPerson(id);
  });
}

async function init() {
  state.youngPersonId = getYoungPersonId();
  bindEvents();

  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    hideSelectorMode();
    await loadYoungPerson();
    await loadCurrentView();
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young person.");
    await loadYoungPersonSelector();
  }
}

init();
