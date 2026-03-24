window.onerror = function(message, source, line, col, error) {
  console.error("window.onerror", { message, source, line, col, error });
};

window.onunhandledrejection = function(event) {
  console.error("unhandledrejection", event.reason);
};

let currentUser = null;
let youngPeople = [];
let selectedYoungPerson = null;
let selectedYoungPersonBundle = null;

const $ = id => document.getElementById(id);
const has = id => !!document.getElementById(id);

function safe(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normArray(value) {
  return Array.isArray(value) ? value : [];
}

function normObj(value) {
  return value && typeof value === "object" ? value : {};
}

function banner(text, ms = 2400) {
  const el = $("status");
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(banner._t);
  banner._t = setTimeout(() => {
    el.style.display = "none";
  }, ms);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {})
    }
  });

  if (res.status === 401) {
    location.href = "/login";
    return null;
  }

  const type = res.headers.get("content-type") || "";
  let data = null;

  try {
    if (type.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text ? { detail: text } : {};
    }
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `Request failed (${res.status})`);
  }

  return data || {};
}

function fullName(person) {
  const preferred = String(person?.preferred_name || "").trim();
  const first = String(person?.first_name || "").trim();
  const last = String(person?.last_name || "").trim();
  if (preferred) return preferred;
  return [first, last].filter(Boolean).join(" ").trim() || "Unnamed young person";
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return String(age);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safe(value);
  return d.toLocaleDateString("en-GB");
}

function setTitle(text = "Young People OS") {
  if (has("title")) $("title").textContent = text;
}

function setActiveTab(name) {
  document.querySelectorAll("[data-yp-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.ypTab === name);
  });

  document.querySelectorAll(".yp-tab-panel").forEach(panel => {
    panel.classList.add("hidden");
  });

  if (has(`yp-tab-${name}`)) {
    $(`yp-tab-${name}`).classList.remove("hidden");
  }
}

function renderEmptyState() {
  if (has("youngPeopleDetail")) {
    $("youngPeopleDetail").innerHTML = `
      <div class="viewbox">
        <h3>Select a young person</h3>
        <p>Choose a record from the list to open their profile, alerts, contacts, and overview.</p>
      </div>
    `;
  }
}

async function loadMe() {
  const data = await api("/auth/me");
  if (!data?.user) throw new Error("No user");
  currentUser = data.user;
}

async function loadYoungPeople() {
  const search = has("ypSearch") ? $("ypSearch").value.trim() : "";
  const includeArchived = has("ypIncludeArchived") ? $("ypIncludeArchived").checked : false;

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (includeArchived) params.set("include_archived", "true");

  const data = await api(`/young-people${params.toString() ? `?${params}` : ""}`);
  youngPeople = normArray(data?.young_people);
  renderYoungPeopleList();

  if (selectedYoungPerson?.id) {
    const fresh = youngPeople.find(p => Number(p?.id) === Number(selectedYoungPerson.id));
    if (fresh) {
      await openYoungPerson(fresh.id);
    } else {
      selectedYoungPerson = null;
      selectedYoungPersonBundle = null;
      renderEmptyState();
    }
  }
}

function renderYoungPeopleList() {
  const host = $("youngPeopleList");
  if (!host) return;

  host.innerHTML = "";

  if (!youngPeople.length) {
    host.innerHTML = `<div class="entity-row"><div>No young people found.</div></div>`;
    return;
  }

  youngPeople.forEach(person => {
    const age = calcAge(person?.date_of_birth);
    const row = document.createElement("div");
    row.className = `entity-row ${Number(selectedYoungPerson?.id) === Number(person?.id) ? "active" : ""}`;
    row.style.cursor = "pointer";
    row.innerHTML = `
      <div style="width:100%;">
        <div class="entity-title">${safe(fullName(person))}</div>
        <div class="entity-meta">
          ${person?.placement_status ? safe(person.placement_status) : "placement unknown"}
          ${age ? ` · age ${safe(age)}` : ""}
          ${person?.summary_risk_level ? ` · ${safe(person.summary_risk_level)} risk` : ""}
        </div>
        <div class="entity-meta">
          Admitted: ${safe(formatDate(person?.admission_date))}
          ${person?.archived ? ` · <span class="tag bad">archived</span>` : ""}
        </div>
      </div>
    `;
    row.onclick = () => openYoungPerson(person.id);
    host.appendChild(row);
  });
}

function statCard(label, value) {
  return `
    <div class="s">
      <div class="n">${safe(String(value ?? 0))}</div>
      <div class="l">${safe(label)}</div>
    </div>
  `;
}

function renderOverviewTab(bundle) {
  const youngPerson = normObj(bundle?.young_person);
  const counts = normObj(bundle?.dashboard_counts);
  const alerts = normArray(bundle?.alerts);
  const recent = normArray(bundle?.recent_activity);

  if (!has("yp-tab-overview")) return;

  $("yp-tab-overview").innerHTML = `
    <div class="summary" style="margin-bottom:16px;">
      ${statCard("Daily notes", counts.daily_notes || 0)}
      ${statCard("Incidents", counts.incidents || 0)}
      ${statCard("Risks", counts.risk_assessments || 0)}
      ${statCard("Contacts", counts.contacts || 0)}
    </div>

    <div class="library-grid">
      <div class="card">
        <strong>Profile snapshot</strong>
        <div class="entity-meta"><strong>Name:</strong> ${safe(fullName(youngPerson))}</div>
        <div class="entity-meta"><strong>DOB:</strong> ${safe(formatDate(youngPerson?.date_of_birth))}</div>
        <div class="entity-meta"><strong>Age:</strong> ${safe(calcAge(youngPerson?.date_of_birth) || "—")}</div>
        <div class="entity-meta"><strong>Gender:</strong> ${safe(youngPerson?.gender || "—")}</div>
        <div class="entity-meta"><strong>Ethnicity:</strong> ${safe(youngPerson?.ethnicity || "—")}</div>
        <div class="entity-meta"><strong>Placement status:</strong> ${safe(youngPerson?.placement_status || "—")}</div>
        <div class="entity-meta"><strong>Admission date:</strong> ${safe(formatDate(youngPerson?.admission_date))}</div>
        <div class="entity-meta"><strong>Summary risk:</strong> ${safe(youngPerson?.summary_risk_level || "—")}</div>
      </div>

      <div class="card">
        <strong>Active alerts</strong>
        ${
          alerts.length
            ? alerts.map(alert => `
              <div class="entity-row">
                <div>
                  <div class="entity-title">${safe(alert?.title || "Alert")}</div>
                  <div class="entity-meta">
                    <span class="tag ${alert?.severity === "high" ? "bad" : alert?.severity === "medium" ? "warn" : "neutral"}">
                      ${safe(alert?.severity || "standard")}
                    </span>
                    ${safe(alert?.alert_type || "")}
                  </div>
                  <div class="entity-meta">${safe(alert?.description || "")}</div>
                </div>
              </div>
            `).join("")
            : `<div class="entity-row"><div>No active alerts.</div></div>`
        }
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <strong>Recent activity</strong>
      ${
        recent.length
          ? recent.map(item => `
            <div class="entity-row">
              <div>
                <div class="entity-title">${safe(item?.title || item?.source_table || "Activity")}</div>
                <div class="entity-meta">
                  ${safe(item?.source_table || "record")}
                  ${item?.event_datetime ? ` · ${safe(formatDate(item.event_datetime))}` : ""}
                </div>
                <div class="entity-meta">${safe(item?.summary || item?.description || "")}</div>
              </div>
            </div>
          `).join("")
          : `<div class="entity-row"><div>No recent activity found.</div></div>`
      }
    </div>
  `;
}

function textBlock(label, value) {
  return `
    <div>
      <div class="entity-meta" style="font-weight:600;">${safe(label)}</div>
      <div style="line-height:1.65;margin-top:6px;">${safe(value || "—")}</div>
    </div>
  `;
}

function renderProfilesTab(bundle) {
  const communication = normObj(bundle?.communication_profile);
  const education = normObj(bundle?.education_profile);
  const health = normObj(bundle?.health_profile);
  const identity = normObj(bundle?.identity_profile);
  const legal = normObj(bundle?.legal_status);

  if (!has("yp-tab-profiles")) return;

  $("yp-tab-profiles").innerHTML = `
    <div class="library-grid">
      <div class="card">
        <strong>Communication profile</strong>
        ${textBlock("Neurodiversity summary", communication?.neurodiversity_summary)}
        ${textBlock("Communication style", communication?.communication_style)}
        ${textBlock("Sensory profile", communication?.sensory_profile)}
        ${textBlock("Processing needs", communication?.processing_needs)}
        ${textBlock("Signs of distress", communication?.signs_of_distress)}
        ${textBlock("What helps", communication?.what_helps)}
        ${textBlock("What to avoid", communication?.what_to_avoid)}
        ${textBlock("Routines and predictability", communication?.routines_and_predictability)}
        ${textBlock("Visual support needs", communication?.visual_support_needs)}
      </div>

      <div class="card">
        <strong>Education profile</strong>
        ${textBlock("School name", education?.school_name)}
        ${textBlock("Year group", education?.year_group)}
        ${textBlock("Education status", education?.education_status)}
        ${textBlock("SEN status", education?.sen_status)}
        ${textBlock("EHCP details", education?.ehcp_details)}
        ${textBlock("Designated teacher", education?.designated_teacher)}
        ${textBlock("Attendance baseline", education?.attendance_baseline)}
        ${textBlock("PEP status", education?.pep_status)}
        ${textBlock("Support summary", education?.support_summary)}
      </div>

      <div class="card">
        <strong>Health profile</strong>
        ${textBlock("GP", health?.gp_name)}
        ${textBlock("GP contact", health?.gp_contact)}
        ${textBlock("Dentist", health?.dentist_name)}
        ${textBlock("Dentist contact", health?.dentist_contact)}
        ${textBlock("Optician", health?.optician_name)}
        ${textBlock("Optician contact", health?.optician_contact)}
        ${textBlock("Allergies", health?.allergies)}
        ${textBlock("Diagnoses", health?.diagnoses)}
        ${textBlock("Mental health summary", health?.mental_health_summary)}
        ${textBlock("Medication summary", health?.medication_summary)}
        ${textBlock("Consent notes", health?.consent_notes)}
      </div>

      <div class="card">
        <strong>Identity and legal</strong>
        ${textBlock("Religion or faith", identity?.religion_or_faith)}
        ${textBlock("Cultural identity", identity?.cultural_identity)}
        ${textBlock("First language", identity?.first_language)}
        ${textBlock("Dietary needs", identity?.dietary_needs)}
        ${textBlock("Interests", identity?.interests)}
        ${textBlock("Strengths summary", identity?.strengths_summary)}
        ${textBlock("What matters to me", identity?.what_matters_to_me)}
        ${textBlock("Important dates", identity?.important_dates)}
        <hr style="border:none;border-top:1px solid var(--line);margin:8px 0;">
        ${textBlock("Legal status", legal?.legal_status)}
        ${textBlock("Order type", legal?.order_type)}
        ${textBlock("Order details", legal?.order_details)}
        ${textBlock("Delegated authority", legal?.delegated_authority_details)}
        ${textBlock("Restrictions", legal?.restrictions_text)}
        ${textBlock("Consent arrangements", legal?.consent_arrangements)}
      </div>
    </div>
  `;
}

function renderContactsTab(bundle) {
  const contacts = normArray(bundle?.contacts);

  if (!has("yp-tab-contacts")) return;

  $("yp-tab-contacts").innerHTML = `
    <div class="card">
      <strong>Contacts</strong>
      ${
        contacts.length
          ? contacts.map(contact => `
            <div class="entity-row">
              <div>
                <div class="entity-title">${safe(contact?.full_name || "Contact")}</div>
                <div class="entity-meta">
                  ${safe(contact?.relationship_to_young_person || "relationship unknown")}
                  ${contact?.contact_type ? ` · ${safe(contact.contact_type)}` : ""}
                </div>
                <div class="entity-meta">
                  ${contact?.phone ? `Phone: ${safe(contact.phone)}` : ""}
                  ${contact?.email ? ` ${contact?.phone ? "·" : ""} Email: ${safe(contact.email)}` : ""}
                </div>
                <div class="entity-meta">
                  ${contact?.is_parental_responsibility_holder ? `<span class="tag ok">PR</span>` : ""}
                  ${contact?.is_approved_contact ? `<span class="tag ok">approved</span>` : ""}
                  ${contact?.is_restricted_contact ? `<span class="tag bad">restricted</span>` : ""}
                  ${contact?.supervision_level ? `<span class="tag warn">${safe(contact.supervision_level)}</span>` : ""}
                </div>
                ${contact?.notes ? `<div class="entity-meta">${safe(contact.notes)}</div>` : ""}
              </div>
            </div>
          `).join("")
          : `<div class="entity-row"><div>No contacts recorded.</div></div>`
      }
    </div>
  `;
}

function renderAlertsTab(bundle) {
  const alerts = normArray(bundle?.alerts);

  if (!has("yp-tab-alerts")) return;

  $("yp-tab-alerts").innerHTML = `
    <div class="card">
      <strong>Alerts</strong>
      ${
        alerts.length
          ? alerts.map(alert => `
            <div class="entity-row">
              <div>
                <div class="entity-title">${safe(alert?.title || "Alert")}</div>
                <div class="entity-meta">
                  <span class="tag ${alert?.severity === "high" ? "bad" : alert?.severity === "medium" ? "warn" : "neutral"}">
                    ${safe(alert?.severity || "standard")}
                  </span>
                  ${safe(alert?.alert_type || "")}
                  ${alert?.review_date ? ` · review ${safe(formatDate(alert.review_date))}` : ""}
                </div>
                <div class="entity-meta">${safe(alert?.description || "")}</div>
              </div>
            </div>
          `).join("")
          : `<div class="entity-row"><div>No active alerts.</div></div>`
      }
    </div>
  `;
}

function renderHeader(bundle) {
  const person = normObj(bundle?.young_person);

  if (has("ypCurrentName")) {
    $("ypCurrentName").textContent = fullName(person);
  }

  if (has("ypCurrentMeta")) {
    $("ypCurrentMeta").innerHTML = `
      ${safe(person?.placement_status || "placement unknown")}
      ${person?.summary_risk_level ? ` · ${safe(person.summary_risk_level)} risk` : ""}
      ${person?.date_of_birth ? ` · age ${safe(calcAge(person.date_of_birth) || "—")}` : ""}
    `;
  }
}

async function openYoungPerson(id) {
  if (!id) return;

  const data = await api(`/young-people/${id}`);
  const bundle = normObj(data?.bundle);

  if (!bundle || !bundle.young_person) {
    throw new Error("Young person profile could not be loaded");
  }

  selectedYoungPerson = normObj(bundle.young_person);
  selectedYoungPersonBundle = bundle;

  setTitle(fullName(selectedYoungPerson));
  renderYoungPeopleList();
  renderHeader(bundle);
  renderOverviewTab(bundle);
  renderProfilesTab(bundle);
  renderContactsTab(bundle);
  renderAlertsTab(bundle);
  setActiveTab("overview");
}

async function createYoungPerson() {
  const payload = {
    first_name: has("ypFirstName") ? $("ypFirstName").value.trim() : "",
    last_name: has("ypLastName") ? $("ypLastName").value.trim() : "",
    preferred_name: has("ypPreferredName") ? $("ypPreferredName").value.trim() || null : null,
    date_of_birth: has("ypDob") ? $("ypDob").value || null : null,
    gender: has("ypGender") ? $("ypGender").value.trim() || null : null,
    ethnicity: has("ypEthnicity") ? $("ypEthnicity").value.trim() || null : null,
    admission_date: has("ypAdmissionDate") ? $("ypAdmissionDate").value || null : null,
    placement_status: has("ypPlacementStatus") ? $("ypPlacementStatus").value.trim() || null : null,
    summary_risk_level: has("ypRiskLevel") ? $("ypRiskLevel").value.trim() || null : null
  };

  if (!payload.first_name || !payload.last_name) {
    return banner("First name and last name are required");
  }

  const data = await api("/young-people", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  banner("Young person created");

  ["ypFirstName", "ypLastName", "ypPreferredName", "ypDob", "ypGender", "ypEthnicity", "ypAdmissionDate", "ypPlacementStatus", "ypRiskLevel"]
    .forEach(id => {
      if (has(id)) $(id).value = "";
    });

  await loadYoungPeople();

  const createdId = data?.young_person?.id;
  if (createdId) {
    await openYoungPerson(createdId);
  }
}

function bind() {
  if (has("ypSearch")) {
    $("ypSearch").addEventListener("input", () => {
      loadYoungPeople().catch(err => {
        console.error("loadYoungPeople failed", err);
        banner(err.message || "Could not load young people");
      });
    });
  }

  if (has("ypIncludeArchived")) {
    $("ypIncludeArchived").addEventListener("change", () => {
      loadYoungPeople().catch(err => {
        console.error("loadYoungPeople failed", err);
        banner(err.message || "Could not load young people");
      });
    });
  }

  if (has("ypCreateBtn")) {
    $("ypCreateBtn").addEventListener("click", () => {
      createYoungPerson().catch(err => {
        console.error("createYoungPerson failed", err);
        banner(err.message || "Could not create young person");
      });
    });
  }

  if (has("ypRefreshBtn")) {
    $("ypRefreshBtn").addEventListener("click", () => {
      loadYoungPeople().catch(err => {
        console.error("loadYoungPeople failed", err);
        banner(err.message || "Could not load young people");
      });
    });
  }

  document.querySelectorAll("[data-yp-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.ypTab);
    });
  });
}

async function init() {
  bind();
  renderEmptyState();

  try {
    await loadMe();
    await loadYoungPeople();
  } catch (err) {
    console.error("young-people-shell init failed", err);
    banner(err.message || "Could not load young people OS");
  }
}

document.addEventListener("DOMContentLoaded", init);
