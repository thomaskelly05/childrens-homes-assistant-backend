const ENDPOINTS = {
  listYoungPeople: "/young-people/",
  getYoungPerson: (id) => `/young-people/${id}`,
  getYoungPersonProfile: (id) => `/young-people/${id}/profile`,
};

let youngPeopleCache = [];
let selectedYoungPersonId = null;

function fullName(person) {
  const first = person?.first_name || "";
  const last = person?.last_name || "";
  return `${first} ${last}`.trim() || "Unnamed young person";
}

function preferredDisplayName(person) {
  return person?.preferred_name?.trim() || fullName(person);
}

function riskBadgeClass(riskLevel) {
  const value = (riskLevel || "").toString().toLowerCase();

  if (value.includes("high")) return "badge-danger";
  if (value.includes("medium")) return "badge-warning";
  if (value.includes("low")) return "badge-success";
  return "badge-neutral";
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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
}

function setLoading(containerId, text = "Loading...") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loading">${escapeHtml(text)}</div>`;
}

function setError(containerId, text = "Something went wrong") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="error-state">${escapeHtml(text)}</div>`;
}

function renderYoungPeopleList(items) {
  const container = document.getElementById("youngPeopleList");

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  container.innerHTML = items
    .map((yp) => {
      const name = fullName(yp);
      const keyworker =
        yp.primary_keyworker_first_name || yp.primary_keyworker_last_name
          ? `${yp.primary_keyworker_first_name || ""} ${yp.primary_keyworker_last_name || ""}`.trim()
          : "Not assigned";

      const activeClass = selectedYoungPersonId === yp.id ? "active" : "";

      return `
        <article class="yp-card ${activeClass}" data-id="${yp.id}">
          <div class="yp-name-row">
            <div>
              <div class="yp-name">${escapeHtml(name)}</div>
            </div>
            <span class="badge ${riskBadgeClass(yp.summary_risk_level)}">
              ${escapeHtml(yp.summary_risk_level || "No risk set")}
            </span>
          </div>

          <div class="yp-meta">
            <span class="badge badge-neutral">
              ${escapeHtml(yp.placement_status || "Placement not set")}
            </span>
            <span class="badge badge-neutral">
              Keyworker: ${escapeHtml(keyworker)}
            </span>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".yp-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      selectYoungPerson(id);
    });
  });
}

function renderProfile(profileData) {
  const panel = document.getElementById("profilePanel");
  const yp = profileData?.young_person;

  if (!yp) {
    panel.innerHTML = `<div class="empty-panel">Profile not available.</div>`;
    return;
  }

  const name = fullName(yp);
  const displayName = preferredDisplayName(yp);
  const age = calculateAge(yp.date_of_birth);

  const alerts = Array.isArray(profileData.alerts) ? profileData.alerts : [];
  const legalStatus = Array.isArray(profileData.legal_status) ? profileData.legal_status : [];
  const communicationProfile = Array.isArray(profileData.communication_profile)
    ? profileData.communication_profile
    : [];
  const identityProfile = Array.isArray(profileData.identity_profile)
    ? profileData.identity_profile
    : [];

  const latestCommunication = communicationProfile[0];
  const latestIdentity = identityProfile[0];

  panel.innerHTML = `
    <div class="kv">
      <div class="kv-label">Name</div>
      <div class="kv-value">${escapeHtml(name)}</div>

      <div class="kv-label">Preferred name</div>
      <div class="kv-value">${escapeHtml(displayName)}</div>

      <div class="kv-label">Age</div>
      <div class="kv-value">${escapeHtml(age)}</div>

      <div class="kv-label">Date of birth</div>
      <div class="kv-value">${escapeHtml(formatDate(yp.date_of_birth))}</div>

      <div class="kv-label">Gender</div>
      <div class="kv-value">${escapeHtml(yp.gender || "—")}</div>

      <div class="kv-label">Ethnicity</div>
      <div class="kv-value">${escapeHtml(yp.ethnicity || "—")}</div>

      <div class="kv-label">Placement status</div>
      <div class="kv-value">${escapeHtml(yp.placement_status || "—")}</div>

      <div class="kv-label">Admission date</div>
      <div class="kv-value">${escapeHtml(formatDate(yp.admission_date))}</div>

      <div class="kv-label">Discharge date</div>
      <div class="kv-value">${escapeHtml(formatDate(yp.discharge_date))}</div>

      <div class="kv-label">Risk level</div>
      <div class="kv-value">
        <span class="badge ${riskBadgeClass(yp.summary_risk_level)}">
          ${escapeHtml(yp.summary_risk_level || "No risk set")}
        </span>
      </div>

      <div class="kv-label">Primary keyworker</div>
      <div class="kv-value">
        ${escapeHtml(
          `${yp.primary_keyworker_first_name || ""} ${yp.primary_keyworker_last_name || ""}`.trim() || "Not assigned"
        )}
      </div>

      <div class="kv-label">NHS number</div>
      <div class="kv-value">${escapeHtml(yp.nhs_number || "—")}</div>

      <div class="kv-label">Local ID number</div>
      <div class="kv-value">${escapeHtml(yp.local_id_number || "—")}</div>
    </div>

    <div class="section-block">
      <h4>Alerts</h4>
      ${
        alerts.length
          ? `<div class="alert-list">
              ${alerts
                .map(
                  (alert) => `
                    <div class="alert-item">
                      <strong>${escapeHtml(alert.title || alert.alert_type || "Alert")}</strong><br>
                      <div>${escapeHtml(alert.description || alert.summary || "")}</div>
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty-state">No alerts recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Legal Status</h4>
      ${
        legalStatus.length
          ? `<div class="simple-list">
              ${legalStatus
                .map(
                  (item) => `
                    <div class="simple-item">
                      <strong>${escapeHtml(item.status || item.legal_status || "Legal status")}</strong><br>
                      Effective from: ${escapeHtml(formatDate(item.effective_from))}
                    </div>
                  `
                )
                .join("")}
            </div>`
          : `<div class="empty-state">No legal status recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Communication Profile</h4>
      ${
        latestCommunication
          ? `<div class="simple-item">
              <strong>Communication style</strong><br>
              <div>${escapeHtml(latestCommunication.communication_style || "—")}</div>
              <br>
              <strong>Sensory profile</strong><br>
              <div>${escapeHtml(latestCommunication.sensory_profile || "—")}</div>
            </div>`
          : `<div class="empty-state">No communication profile recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Identity Profile</h4>
      ${
        latestIdentity
          ? `<div class="simple-item">
              <strong>Interests</strong><br>
              <div>${escapeHtml(latestIdentity.interests || "—")}</div>
              <br>
              <strong>Strengths summary</strong><br>
              <div>${escapeHtml(latestIdentity.strengths_summary || "—")}</div>
              <br>
              <strong>What matters to me</strong><br>
              <div>${escapeHtml(latestIdentity.what_matters_to_me || "—")}</div>
            </div>`
          : `<div class="empty-state">No identity profile recorded.</div>`
      }
    </div>
  `;
}

async function loadYoungPeople() {
  setLoading("youngPeopleList", "Loading young people...");

  try {
    const res = await fetch(ENDPOINTS.listYoungPeople);
    const data = await res.json();

    const items = Array.isArray(data?.items) ? data.items : [];
    youngPeopleCache = items;

    renderYoungPeopleList(items);

    if (items.length && !selectedYoungPersonId) {
      selectYoungPerson(items[0].id);
    }
  } catch (error) {
    console.error("YP LOAD ERROR", error);
    setError("youngPeopleList", "Unable to load young people.");
  }
}

async function selectYoungPerson(id) {
  selectedYoungPersonId = id;
  renderYoungPeopleList(filterYoungPeople(document.getElementById("youngPeopleSearch")?.value || ""));
  setLoading("profilePanel", "Loading profile...");

  try {
    const res = await fetch(ENDPOINTS.getYoungPersonProfile(id));
    const data = await res.json();
    renderProfile(data);
  } catch (error) {
    console.error("PROFILE LOAD ERROR", error);
    setError("profilePanel", "Unable to load profile.");
  }
}

function filterYoungPeople(query) {
  const value = query.trim().toLowerCase();
  if (!value) return youngPeopleCache;

  return youngPeopleCache.filter((yp) => {
    const haystack = [
      yp.first_name,
      yp.last_name,
      yp.placement_status,
      yp.summary_risk_level,
      yp.primary_keyworker_first_name,
      yp.primary_keyworker_last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(value);
  });
}

function bindEvents() {
  const search = document.getElementById("youngPeopleSearch");
  const refreshBtn = document.getElementById("refreshBtn");

  if (search) {
    search.addEventListener("input", (e) => {
      const filtered = filterYoungPeople(e.target.value);
      renderYoungPeopleList(filtered);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      selectedYoungPersonId = null;
      loadYoungPeople();
      document.getElementById("profilePanel").innerHTML =
        `<div class="empty-panel">Select a young person to view their profile.</div>`;
    });
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function init() {
  bindEvents();
  loadYoungPeople();
}

document.addEventListener("DOMContentLoaded", init);
