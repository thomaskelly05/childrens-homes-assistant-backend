let youngPeople = [];
let selectedYoungPerson = null;
let selectedOverview = null;
let activeProfileTab = "identity";
let editingYoungPersonId = null;

function $(id) {
  return document.getElementById(id);
}

function safe(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function banner(text, ms = 2600) {
  const el = $("statusBanner");
  if (!el) return;
  el.textContent = text || "";
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
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorised");
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  }

  return data;
}

function calcAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }

  return String(age);
}

function initials(person) {
  const first = (person?.preferred_name || person?.first_name || "").trim();
  const last = (person?.last_name || "").trim();
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "YP";
}

function fullName(person) {
  const first = person?.preferred_name || person?.first_name || "";
  const last = person?.last_name || "";
  return [first, last].filter(Boolean).join(" ").trim() || "Unnamed young person";
}

function riskTagClass(level) {
  const text = String(level || "").toLowerCase();
  if (["high", "significant", "severe"].includes(text)) return "danger";
  if (["medium", "moderate"].includes(text)) return "warn";
  if (["low", "stable"].includes(text)) return "good";
  return "";
}

function boolChecked(value) {
  return !!value ? "checked" : "";
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isTruthyCheckbox(input) {
  return !!input?.checked;
}

function openModal(backdropId) {
  const el = $(backdropId);
  if (el) el.classList.add("show");
}

function closeModal(backdropId) {
  const el = $(backdropId);
  if (el) el.classList.remove("show");
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 820) {
    $("ypSidebar")?.classList.remove("open");
  }
}

function renderYoungPersonList() {
  const host = $("youngPersonList");
  if (!host) return;

  const q = (($("youngPersonSearch")?.value || "").trim().toLowerCase());
  const filter = $("youngPersonStatusFilter")?.value || "";

  let rows = [...youngPeople];

  if (q) {
    rows = rows.filter(person => {
      const text = [
        person.first_name,
        person.last_name,
        person.preferred_name
      ].join(" ").toLowerCase();
      return text.includes(q);
    });
  }

  if (filter === "active") {
    rows = rows.filter(person => !person.archived);
  } else if (filter === "archived") {
    rows = rows.filter(person => !!person.archived);
  }

  if (!rows.length) {
    host.innerHTML = `<div class="empty-state">No matching young people found.</div>`;
    return;
  }

  host.innerHTML = rows.map(person => `
    <button
      class="person-card ${selectedYoungPerson && Number(selectedYoungPerson.id) === Number(person.id) ? "active" : ""}"
      data-id="${person.id}"
      type="button"
    >
      <div class="person-name">${safe(fullName(person))}</div>
      <div class="person-meta">
        DOB: ${safe(person.date_of_birth || "—")} · Age: ${safe(calcAge(person.date_of_birth))}<br>
        Placement: ${safe(person.placement_status || "—")}
      </div>
      <div class="tag-row">
        <span class="tag ${riskTagClass(person.summary_risk_level)}">${safe(person.summary_risk_level || "risk not set")}</span>
        <span class="tag ${person.archived ? "warn" : "good"}">${person.archived ? "archived" : "active"}</span>
      </div>
    </button>
  `).join("");

  host.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      const person = youngPeople.find(x => Number(x.id) === id);
      if (!person) return;

      selectedYoungPerson = person;
      renderYoungPersonList();
      closeSidebarOnMobile();
      await loadYoungPersonOverview(id);
    });
  });
}

function renderOverview(overview) {
  const panel = $("overviewPanel");
  if (!panel) return;

  const yp = overview?.young_person || selectedYoungPerson || {};
  const identity = overview?.identity_profile || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const legal = overview?.legal_status || {};
  const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  panel.innerHTML = `
    <div class="hero">
      <div class="photo">
        ${yp.photo_url ? `<img src="${safe(yp.photo_url)}" alt="${safe(fullName(yp))}">` : safe(initials(yp))}
      </div>

      <div>
        <h3>${safe(fullName(yp))}</h3>
        <p>
          Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
          Date of birth: ${safe(yp.date_of_birth || "—")} · Age: ${safe(calcAge(yp.date_of_birth))}<br>
          Placement status: ${safe(yp.placement_status || "—")}
        </p>

        <div class="tag-row">
          <span class="tag ${riskTagClass(yp.summary_risk_level)}">${safe(yp.summary_risk_level || "risk not set")}</span>
          <span class="tag">${safe(yp.gender || "gender not set")}</span>
          <span class="tag">${safe(yp.ethnicity || "ethnicity not set")}</span>
          <span class="tag ${yp.archived ? "warn" : "good"}">${yp.archived ? "archived" : "active"}</span>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="n">${safe(String(contacts.length))}</div>
            <div class="l">Contacts</div>
          </div>
          <div class="stat">
            <div class="n">${safe(String(alerts.filter(a => a.is_active).length))}</div>
            <div class="l">Active alerts</div>
          </div>
          <div class="stat">
            <div class="n">${safe(String(overview?.daily_note_count ?? 0))}</div>
            <div class="l">Daily notes</div>
          </div>
          <div class="stat">
            <div class="n">${safe(String(overview?.incident_count ?? 0))}</div>
            <div class="l">Incidents</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px;">
      <div class="card">
        <h3>Placement and identity</h3>
        <div class="kv"><div class="k">Home</div><div class="v">${safe(yp.home_name || yp.home_id || "—")}</div></div>
        <div class="kv"><div class="k">Admission date</div><div class="v">${safe(yp.admission_date || "—")}</div></div>
        <div class="kv"><div class="k">Discharge date</div><div class="v">${safe(yp.discharge_date || "—")}</div></div>
        <div class="kv"><div class="k">Religion / faith</div><div class="v">${safe(identity.religion_or_faith || "—")}</div></div>
        <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(identity.cultural_identity || "—")}</div></div>
        <div class="kv"><div class="k">What matters</div><div class="v">${safe(identity.what_matters_to_me || "—")}</div></div>
      </div>

      <div class="card">
        <h3>Communication, legal and wellbeing</h3>
        <div class="kv"><div class="k">Communication style</div><div class="v">${safe(communication.communication_style || "—")}</div></div>
        <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
        <div class="kv"><div class="k">Education</div><div class="v">${safe(education.education_status || "—")}</div></div>
        <div class="kv"><div class="k">Mental health</div><div class="v">${safe(health.mental_health_summary || "—")}</div></div>
        <div class="kv"><div class="k">Legal status</div><div class="v">${safe(legal.legal_status || "—")}</div></div>
        <div class="kv"><div class="k">Order type</div><div class="v">${safe(legal.order_type || "—")}</div></div>
      </div>
    </div>
  `;

  renderProfileTab(overview);
  renderAssistantContext(overview);
  renderTimelinePlaceholder(overview);
}

function renderProfileTab(overview) {
  const host = $("profileTabContent");
  if (!host) return;

  const identity = overview?.identity_profile || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const legal = overview?.legal_status || {};
  const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  if (!selectedYoungPerson) {
    host.innerHTML = `<div class="empty-state">Select a young person first.</div>`;
    return;
  }

  if (activeProfileTab === "identity") {
    host.innerHTML = `
      <div class="notice" style="margin-bottom:14px;">Edit and save the identity profile for the selected young person.</div>
      <div class="form-grid">
        <div class="form-section">
          <label for="identityReligion">Religion / faith</label>
          <input id="identityReligion" class="field" value="${safe(identity.religion_or_faith || "")}">
        </div>
        <div class="form-section">
          <label for="identityCulture">Cultural identity</label>
          <input id="identityCulture" class="field" value="${safe(identity.cultural_identity || "")}">
        </div>
        <div class="form-section">
          <label for="identityLanguage">First language</label>
          <input id="identityLanguage" class="field" value="${safe(identity.first_language || "")}">
        </div>
        <div class="form-section">
          <label for="identityDietary">Dietary needs</label>
          <input id="identityDietary" class="field" value="${safe(identity.dietary_needs || "")}">
        </div>
        <div class="form-section full">
          <label for="identityInterests">Interests</label>
          <textarea id="identityInterests" class="textarea">${safe(identity.interests || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="identityStrengths">Strengths summary</label>
          <textarea id="identityStrengths" class="textarea">${safe(identity.strengths_summary || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="identityMatters">What matters to me</label>
          <textarea id="identityMatters" class="textarea">${safe(identity.what_matters_to_me || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="identityDates">Important dates</label>
          <textarea id="identityDates" class="textarea">${safe(identity.important_dates || "")}</textarea>
        </div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "communication") {
    host.innerHTML = `
      <div class="notice" style="margin-bottom:14px;">Record how the young person communicates, what helps, and what staff need to notice.</div>
      <div class="form-grid">
        <div class="form-section full">
          <label for="commNeuro">Neurodiversity summary</label>
          <textarea id="commNeuro" class="textarea">${safe(communication.neurodiversity_summary || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commStyle">Communication style</label>
          <textarea id="commStyle" class="textarea">${safe(communication.communication_style || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commSensory">Sensory profile</label>
          <textarea id="commSensory" class="textarea">${safe(communication.sensory_profile || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commProcessing">Processing needs</label>
          <textarea id="commProcessing" class="textarea">${safe(communication.processing_needs || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commDistress">Signs of distress</label>
          <textarea id="commDistress" class="textarea">${safe(communication.signs_of_distress || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commHelps">What helps</label>
          <textarea id="commHelps" class="textarea">${safe(communication.what_helps || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commAvoid">What to avoid</label>
          <textarea id="commAvoid" class="textarea">${safe(communication.what_to_avoid || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commRoutine">Routines and predictability</label>
          <textarea id="commRoutine" class="textarea">${safe(communication.routines_and_predictability || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="commVisual">Visual support needs</label>
          <textarea id="commVisual" class="textarea">${safe(communication.visual_support_needs || "")}</textarea>
        </div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "education") {
    host.innerHTML = `
      <div class="notice" style="margin-bottom:14px;">Keep school, SEN and attendance information current for planning and review.</div>
      <div class="form-grid">
        <div class="form-section">
          <label for="eduSchool">School name</label>
          <input id="eduSchool" class="field" value="${safe(education.school_name || "")}">
        </div>
        <div class="form-section">
          <label for="eduYearGroup">Year group</label>
          <input id="eduYearGroup" class="field" value="${safe(education.year_group || "")}">
        </div>
        <div class="form-section">
          <label for="eduStatus">Education status</label>
          <input id="eduStatus" class="field" value="${safe(education.education_status || "")}">
        </div>
        <div class="form-section">
          <label for="eduSen">SEN status</label>
          <input id="eduSen" class="field" value="${safe(education.sen_status || "")}">
        </div>
        <div class="form-section full">
          <label for="eduEhcp">EHCP details</label>
          <textarea id="eduEhcp" class="textarea">${safe(education.ehcp_details || "")}</textarea>
        </div>
        <div class="form-section">
          <label for="eduTeacher">Designated teacher</label>
          <input id="eduTeacher" class="field" value="${safe(education.designated_teacher || "")}">
        </div>
        <div class="form-section">
          <label for="eduAttendance">Attendance baseline</label>
          <input id="eduAttendance" class="field" type="number" step="0.01" value="${safe(education.attendance_baseline ?? "")}">
        </div>
        <div class="form-section">
          <label for="eduPep">PEP status</label>
          <input id="eduPep" class="field" value="${safe(education.pep_status || "")}">
        </div>
        <div class="form-section full">
          <label for="eduSupport">Support summary</label>
          <textarea id="eduSupport" class="textarea">${safe(education.support_summary || "")}</textarea>
        </div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "health") {
    host.innerHTML = `
      <div class="notice" style="margin-bottom:14px;">Record key health contacts, diagnoses, allergies, and mental health information.</div>
      <div class="form-grid">
        <div class="form-section">
          <label for="healthGpName">GP name</label>
          <input id="healthGpName" class="field" value="${safe(health.gp_name || "")}">
        </div>
        <div class="form-section">
          <label for="healthGpContact">GP contact</label>
          <input id="healthGpContact" class="field" value="${safe(health.gp_contact || "")}">
        </div>
        <div class="form-section">
          <label for="healthDentistName">Dentist name</label>
          <input id="healthDentistName" class="field" value="${safe(health.dentist_name || "")}">
        </div>
        <div class="form-section">
          <label for="healthDentistContact">Dentist contact</label>
          <input id="healthDentistContact" class="field" value="${safe(health.dentist_contact || "")}">
        </div>
        <div class="form-section">
          <label for="healthOpticianName">Optician name</label>
          <input id="healthOpticianName" class="field" value="${safe(health.optician_name || "")}">
        </div>
        <div class="form-section">
          <label for="healthOpticianContact">Optician contact</label>
          <input id="healthOpticianContact" class="field" value="${safe(health.optician_contact || "")}">
        </div>
        <div class="form-section full">
          <label for="healthAllergies">Allergies</label>
          <textarea id="healthAllergies" class="textarea">${safe(health.allergies || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="healthDiagnoses">Diagnoses</label>
          <textarea id="healthDiagnoses" class="textarea">${safe(health.diagnoses || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="healthMental">Mental health summary</label>
          <textarea id="healthMental" class="textarea">${safe(health.mental_health_summary || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="healthMedication">Medication summary</label>
          <textarea id="healthMedication" class="textarea">${safe(health.medication_summary || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="healthConsent">Consent notes</label>
          <textarea id="healthConsent" class="textarea">${safe(health.consent_notes || "")}</textarea>
        </div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "legal") {
    host.innerHTML = `
      <div class="notice" style="margin-bottom:14px;">Use this section for current legal status, delegated authority, and restrictions.</div>
      <div class="form-grid">
        <div class="form-section">
          <label for="legalStatus">Legal status</label>
          <input id="legalStatus" class="field" value="${safe(legal.legal_status || "")}">
        </div>
        <div class="form-section">
          <label for="legalOrderType">Order type</label>
          <input id="legalOrderType" class="field" value="${safe(legal.order_type || "")}">
        </div>
        <div class="form-section full">
          <label for="legalOrderDetails">Order details</label>
          <textarea id="legalOrderDetails" class="textarea">${safe(legal.order_details || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="legalDelegated">Delegated authority details</label>
          <textarea id="legalDelegated" class="textarea">${safe(legal.delegated_authority_details || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="legalRestrictions">Restrictions</label>
          <textarea id="legalRestrictions" class="textarea">${safe(legal.restrictions_text || "")}</textarea>
        </div>
        <div class="form-section full">
          <label for="legalConsent">Consent arrangements</label>
          <textarea id="legalConsent" class="textarea">${safe(legal.consent_arrangements || "")}</textarea>
        </div>
        <div class="form-section">
          <label for="legalEffectiveFrom">Effective from</label>
          <input id="legalEffectiveFrom" class="field" type="date" value="${safe(legal.effective_from || "")}">
        </div>
        <div class="form-section">
          <label for="legalEffectiveTo">Effective to</label>
          <input id="legalEffectiveTo" class="field" type="date" value="${safe(legal.effective_to || "")}">
        </div>
        <div class="form-section full">
          <label style="display:flex;align-items:center;gap:10px;color:var(--text);">
            <input id="legalCurrent" type="checkbox" ${boolChecked(legal.is_current !== false)} style="width:18px;height:18px;">
            Mark as current legal status
          </label>
        </div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "contacts") {
    host.innerHTML = contacts.length ? `
      <div class="mini-list">
        ${contacts.map(contact => `
          <div class="mini-item">
            <strong>${safe(contact.full_name || "Unnamed contact")}</strong>
            <p>
              ${safe(contact.relationship_to_young_person || "Relationship not set")} · ${safe(contact.contact_type || "contact")}<br>
              Phone: ${safe(contact.phone || "—")} · Email: ${safe(contact.email || "—")}<br>
              Supervision: ${safe(contact.supervision_level || "—")}<br>
              ${contact.is_parental_responsibility_holder ? "Holds parental responsibility · " : ""}${contact.is_approved_contact ? "Approved contact · " : ""}${contact.is_restricted_contact ? "Restricted contact" : ""}
            </p>
          </div>
        `).join("")}
      </div>
    ` : `<div class="empty-state">No contacts recorded yet.</div>`;
    return;
  }

  if (activeProfileTab === "alerts") {
    host.innerHTML = alerts.length ? `
      <div class="mini-list">
        ${alerts.map(alert => `
          <div class="mini-item">
            <strong>${safe(alert.title || "Alert")}</strong>
            <p>
              ${safe(alert.alert_type || "alert")} · ${safe(alert.severity || "severity not set")}<br>
              ${safe(alert.description || "No description")}<br>
              Review date: ${safe(alert.review_date || "—")} · ${alert.is_active ? "active" : "inactive"}${alert.show_globally ? " · global" : ""}
            </p>
          </div>
        `).join("")}
      </div>
    ` : `<div class="empty-state">No alerts recorded yet.</div>`;
  }
}

function renderAssistantContext(overview) {
  const yp = overview?.young_person || selectedYoungPerson || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const legal = overview?.legal_status || {};
  const box = $("assistantContextBox");
  if (!box) return;

  box.innerHTML = `
    <strong style="display:block;margin-bottom:8px;color:var(--text);">Assistant context for ${safe(fullName(yp))}</strong>
    Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
    Placement status: ${safe(yp.placement_status || "—")}<br>
    Risk level: ${safe(yp.summary_risk_level || "—")}<br>
    Communication: ${safe(communication.communication_style || "—")}<br>
    What helps: ${safe(communication.what_helps || "—")}<br>
    Education: ${safe(education.education_status || "—")}<br>
    Mental health: ${safe(health.mental_health_summary || "—")}<br>
    Legal status: ${safe(legal.legal_status || "—")}
  `;
}

function renderTimelinePlaceholder(overview) {
  const host = $("timelinePanel");
  if (!host) return;
  const yp = overview?.young_person || selectedYoungPerson || {};

  host.innerHTML = `
    <div class="assistant-prompt">
      Timeline placeholder for <strong>${safe(fullName(yp))}</strong>.<br><br>
      Next step: link this panel to daily notes, incidents, keywork, health events, education records, family contact, missing episodes, and chronology events.
    </div>
  `;
}

async function loadYoungPeople() {
  const data = await api("/young-people");
  youngPeople = Array.isArray(data?.young_people) ? data.young_people : [];
  renderYoungPersonList();

  if (selectedYoungPerson?.id) {
    const refreshed = youngPeople.find(p => Number(p.id) === Number(selectedYoungPerson.id));
    if (refreshed) {
      selectedYoungPerson = refreshed;
      renderYoungPersonList();
      await loadYoungPersonOverview(refreshed.id);
      return;
    }
  }

  if (!selectedYoungPerson && youngPeople.length) {
    selectedYoungPerson = youngPeople[0];
    renderYoungPersonList();
    await loadYoungPersonOverview(selectedYoungPerson.id);
  }
}

async function loadYoungPersonOverview(id) {
  const data = await api(`/young-people/${id}/overview`);
  const overview = data?.overview || {};
  selectedOverview = overview;
  selectedYoungPerson = overview?.young_person || selectedYoungPerson;

  if ($("pageTitle")) $("pageTitle").textContent = fullName(selectedYoungPerson);
  if ($("pageSubtitle")) {
    $("pageSubtitle").textContent =
      `Placement: ${selectedYoungPerson?.placement_status || "—"} · Risk: ${selectedYoungPerson?.summary_risk_level || "—"}`;
  }

  renderOverview(overview);
}

function openCreateYoungPersonModal() {
  editingYoungPersonId = null;
  $("youngPersonModalTitle").textContent = "Add young person";
  $("youngPersonForm").reset();
  $("ypArchived").checked = false;
  openModal("youngPersonModalBackdrop");
}

function openEditYoungPersonModal() {
  if (!selectedYoungPerson) {
    banner("Select a young person first.");
    return;
  }

  editingYoungPersonId = Number(selectedYoungPerson.id);
  $("youngPersonModalTitle").textContent = "Edit young person";

  $("ypHomeId").value = selectedYoungPerson.home_id ?? "";
  $("ypPrimaryKeyworkerId").value = selectedYoungPerson.primary_keyworker_id ?? "";
  $("ypFirstName").value = selectedYoungPerson.first_name || "";
  $("ypLastName").value = selectedYoungPerson.last_name || "";
  $("ypPreferredName").value = selectedYoungPerson.preferred_name || "";
  $("ypDateOfBirth").value = selectedYoungPerson.date_of_birth || "";
  $("ypGender").value = selectedYoungPerson.gender || "";
  $("ypEthnicity").value = selectedYoungPerson.ethnicity || "";
  $("ypNhsNumber").value = selectedYoungPerson.nhs_number || "";
  $("ypLocalIdNumber").value = selectedYoungPerson.local_id_number || "";
  $("ypAdmissionDate").value = selectedYoungPerson.admission_date || "";
  $("ypDischargeDate").value = selectedYoungPerson.discharge_date || "";
  $("ypPlacementStatus").value = selectedYoungPerson.placement_status || "";
  $("ypRiskLevel").value = selectedYoungPerson.summary_risk_level || "";
  $("ypPhotoUrl").value = selectedYoungPerson.photo_url || "";
  $("ypArchived").checked = !!selectedYoungPerson.archived;

  openModal("youngPersonModalBackdrop");
}

async function saveYoungPersonForm(event) {
  event.preventDefault();

  const payload = {
    home_id: numberOrNull($("ypHomeId").value),
    first_name: $("ypFirstName").value.trim(),
    last_name: emptyToNull($("ypLastName").value),
    preferred_name: emptyToNull($("ypPreferredName").value),
    date_of_birth: emptyToNull($("ypDateOfBirth").value),
    gender: emptyToNull($("ypGender").value),
    ethnicity: emptyToNull($("ypEthnicity").value),
    nhs_number: emptyToNull($("ypNhsNumber").value),
    local_id_number: emptyToNull($("ypLocalIdNumber").value),
    admission_date: emptyToNull($("ypAdmissionDate").value),
    discharge_date: emptyToNull($("ypDischargeDate").value),
    placement_status: emptyToNull($("ypPlacementStatus").value),
    primary_keyworker_id: numberOrNull($("ypPrimaryKeyworkerId").value),
    summary_risk_level: emptyToNull($("ypRiskLevel").value),
    photo_url: emptyToNull($("ypPhotoUrl").value),
    archived: isTruthyCheckbox($("ypArchived")),
  };

  if (!payload.home_id || !payload.first_name) {
    banner("Home ID and first name are required.");
    return;
  }

  if (editingYoungPersonId) {
    await api(`/young-people/${editingYoungPersonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    banner("Young person updated.");
  } else {
    await api("/young-people", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    banner("Young person created.");
  }

  closeModal("youngPersonModalBackdrop");
  await loadYoungPeople();
}

function openContactModal() {
  if (!selectedYoungPerson) {
    banner("Select a young person first.");
    return;
  }
  $("contactForm").reset();
  openModal("contactModalBackdrop");
}

async function saveContactForm(event) {
  event.preventDefault();

  if (!selectedYoungPerson?.id) {
    banner("Select a young person first.");
    return;
  }

  const payload = {
    contact_type: emptyToNull($("contactType").value),
    full_name: $("contactFullName").value.trim(),
    relationship_to_young_person: emptyToNull($("contactRelationship").value),
    phone: emptyToNull($("contactPhone").value),
    email: emptyToNull($("contactEmail").value),
    address: emptyToNull($("contactAddress").value),
    is_parental_responsibility_holder: isTruthyCheckbox($("contactPr")),
    is_approved_contact: isTruthyCheckbox($("contactApproved")),
    is_restricted_contact: isTruthyCheckbox($("contactRestricted")),
    supervision_level: emptyToNull($("contactSupervisionLevel").value),
    notes: emptyToNull($("contactNotes").value),
  };

  if (!payload.full_name) {
    banner("Contact full name is required.");
    return;
  }

  await api(`/young-people/${selectedYoungPerson.id}/contacts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  banner("Contact added.");
  closeModal("contactModalBackdrop");
  await loadYoungPersonOverview(selectedYoungPerson.id);
  activeProfileTab = "contacts";
  syncTabs();
}

function openAlertModal() {
  if (!selectedYoungPerson) {
    banner("Select a young person first.");
    return;
  }
  $("alertForm").reset();
  $("alertActive").checked = true;
  $("alertGlobal").checked = false;
  openModal("alertModalBackdrop");
}

async function saveAlertForm(event) {
  event.preventDefault();

  if (!selectedYoungPerson?.id) {
    banner("Select a young person first.");
    return;
  }

  const payload = {
    alert_type: emptyToNull($("alertType").value),
    title: $("alertTitle").value.trim(),
    description: emptyToNull($("alertDescription").value),
    severity: emptyToNull($("alertSeverity").value),
    is_active: isTruthyCheckbox($("alertActive")),
    show_globally: isTruthyCheckbox($("alertGlobal")),
    review_date: emptyToNull($("alertReviewDate").value),
  };

  if (!payload.title) {
    banner("Alert title is required.");
    return;
  }

  await api(`/young-people/${selectedYoungPerson.id}/alerts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  banner("Alert added.");
  closeModal("alertModalBackdrop");
  await loadYoungPersonOverview(selectedYoungPerson.id);
  activeProfileTab = "alerts";
  syncTabs();
}

async function saveCurrentProfileTab() {
  if (!selectedYoungPerson?.id) {
    banner("Select a young person first.");
    return;
  }

  const id = selectedYoungPerson.id;
  let url = "";
  let payload = {};

  if (activeProfileTab === "identity") {
    url = `/young-people/${id}/identity-profile`;
    payload = {
      religion_or_faith: emptyToNull($("identityReligion")?.value),
      cultural_identity: emptyToNull($("identityCulture")?.value),
      first_language: emptyToNull($("identityLanguage")?.value),
      dietary_needs: emptyToNull($("identityDietary")?.value),
      interests: emptyToNull($("identityInterests")?.value),
      strengths_summary: emptyToNull($("identityStrengths")?.value),
      what_matters_to_me: emptyToNull($("identityMatters")?.value),
      important_dates: emptyToNull($("identityDates")?.value),
    };
  } else if (activeProfileTab === "communication") {
    url = `/young-people/${id}/communication-profile`;
    payload = {
      neurodiversity_summary: emptyToNull($("commNeuro")?.value),
      communication_style: emptyToNull($("commStyle")?.value),
      sensory_profile: emptyToNull($("commSensory")?.value),
      processing_needs: emptyToNull($("commProcessing")?.value),
      signs_of_distress: emptyToNull($("commDistress")?.value),
      what_helps: emptyToNull($("commHelps")?.value),
      what_to_avoid: emptyToNull($("commAvoid")?.value),
      routines_and_predictability: emptyToNull($("commRoutine")?.value),
      visual_support_needs: emptyToNull($("commVisual")?.value),
    };
  } else if (activeProfileTab === "education") {
    url = `/young-people/${id}/education-profile`;
    payload = {
      school_name: emptyToNull($("eduSchool")?.value),
      year_group: emptyToNull($("eduYearGroup")?.value),
      education_status: emptyToNull($("eduStatus")?.value),
      sen_status: emptyToNull($("eduSen")?.value),
      ehcp_details: emptyToNull($("eduEhcp")?.value),
      designated_teacher: emptyToNull($("eduTeacher")?.value),
      attendance_baseline: $("eduAttendance")?.value === "" ? null : numberOrNull($("eduAttendance")?.value),
      pep_status: emptyToNull($("eduPep")?.value),
      support_summary: emptyToNull($("eduSupport")?.value),
    };
  } else if (activeProfileTab === "health") {
    url = `/young-people/${id}/health-profile`;
    payload = {
      gp_name: emptyToNull($("healthGpName")?.value),
      gp_contact: emptyToNull($("healthGpContact")?.value),
      dentist_name: emptyToNull($("healthDentistName")?.value),
      dentist_contact: emptyToNull($("healthDentistContact")?.value),
      optician_name: emptyToNull($("healthOpticianName")?.value),
      optician_contact: emptyToNull($("healthOpticianContact")?.value),
      allergies: emptyToNull($("healthAllergies")?.value),
      diagnoses: emptyToNull($("healthDiagnoses")?.value),
      mental_health_summary: emptyToNull($("healthMental")?.value),
      medication_summary: emptyToNull($("healthMedication")?.value),
      consent_notes: emptyToNull($("healthConsent")?.value),
    };
  } else if (activeProfileTab === "legal") {
    url = `/young-people/${id}/legal-status`;
    payload = {
      legal_status: emptyToNull($("legalStatus")?.value),
      order_type: emptyToNull($("legalOrderType")?.value),
      order_details: emptyToNull($("legalOrderDetails")?.value),
      delegated_authority_details: emptyToNull($("legalDelegated")?.value),
      restrictions_text: emptyToNull($("legalRestrictions")?.value),
      consent_arrangements: emptyToNull($("legalConsent")?.value),
      effective_from: emptyToNull($("legalEffectiveFrom")?.value),
      effective_to: emptyToNull($("legalEffectiveTo")?.value),
      is_current: isTruthyCheckbox($("legalCurrent")),
    };
  } else {
    banner("This tab is view-only. Use Add contact or Add alert.");
    return;
  }

  await api(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  banner("Profile saved.");
  await loadYoungPersonOverview(id);
}

function buildAssistantContextText() {
  if (!selectedOverview?.young_person) return "";

  const yp = selectedOverview.young_person;
  const communication = selectedOverview.communication_profile || {};
  const education = selectedOverview.education_profile || {};
  const health = selectedOverview.health_profile || {};
  const legal = selectedOverview.legal_status || {};

  return [
    `Young person: ${fullName(yp)}`,
    `Preferred name: ${yp.preferred_name || yp.first_name || ""}`,
    `DOB: ${yp.date_of_birth || ""}`,
    `Placement status: ${yp.placement_status || ""}`,
    `Risk level: ${yp.summary_risk_level || ""}`,
    `Communication style: ${communication.communication_style || ""}`,
    `What helps: ${communication.what_helps || ""}`,
    `Education status: ${education.education_status || ""}`,
    `Mental health summary: ${health.mental_health_summary || ""}`,
    `Legal status: ${legal.legal_status || ""}`,
  ].join("\n");
}

async function copyAssistantContext(actionLabel = "") {
  if (!selectedYoungPerson) {
    banner("Select a young person first.");
    return;
  }

  const context = buildAssistantContextText();
  const prompt = [
    context,
    "",
    actionLabel ? `Task: ${actionLabel}` : "Open the assistant and use this young person as the current working context."
  ].join("\n");

  await navigator.clipboard.writeText(prompt);
  banner("Young person context copied for assistant.");
}

function syncTabs() {
  document.querySelectorAll("[data-profile-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-profile-tab") === activeProfileTab);
  });

  if (selectedOverview) {
    renderProfileTab(selectedOverview);
  }
}

function bindTabs() {
  document.querySelectorAll("[data-profile-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeProfileTab = btn.getAttribute("data-profile-tab");
      syncTabs();
    });
  });
}

function bindLayout() {
  const sidebar = $("ypSidebar");

  $("openSidebarBtn")?.addEventListener("click", () => sidebar?.classList.add("open"));
  $("closeSidebarBtn")?.addEventListener("click", () => sidebar?.classList.remove("open"));

  $("refreshYoungPeopleBtn")?.addEventListener("click", async () => {
    try {
      await loadYoungPeople();
      banner("Young people refreshed.");
    } catch (e) {
      banner(e.message || "Could not refresh.");
    }
  });

  $("youngPersonSearch")?.addEventListener("input", renderYoungPersonList);
  $("youngPersonStatusFilter")?.addEventListener("change", renderYoungPersonList);

  $("newYoungPersonBtn")?.addEventListener("click", openCreateYoungPersonModal);
  $("editYoungPersonBtn")?.addEventListener("click", openEditYoungPersonModal);

  $("openAssistantBtn")?.addEventListener("click", async () => {
    try {
      await copyAssistantContext();
    } catch (e) {
      banner(e.message || "Could not copy assistant context.");
    }
  });

  document.querySelectorAll("[data-assistant-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const label = btn.getAttribute("data-assistant-action") || "assistant task";
      try {
        await copyAssistantContext(label);
      } catch (e) {
        banner(e.message || "Could not copy assistant task context.");
      }
    });
  });

  $("saveCurrentTabBtn")?.addEventListener("click", async () => {
    try {
      await saveCurrentProfileTab();
    } catch (e) {
      banner(e.message || "Could not save profile.");
    }
  });

  $("addContactBtn")?.addEventListener("click", openContactModal);
  $("addAlertBtn")?.addEventListener("click", openAlertModal);
}

function bindModals() {
  $("youngPersonForm")?.addEventListener("submit", async (e) => {
    try {
      await saveYoungPersonForm(e);
    } catch (err) {
      banner(err.message || "Could not save young person.");
    }
  });

  $("cancelYoungPersonFormBtn")?.addEventListener("click", () => closeModal("youngPersonModalBackdrop"));
  $("closeYoungPersonModalBtn")?.addEventListener("click", () => closeModal("youngPersonModalBackdrop"));

  $("contactForm")?.addEventListener("submit", async (e) => {
    try {
      await saveContactForm(e);
    } catch (err) {
      banner(err.message || "Could not save contact.");
    }
  });

  $("cancelContactFormBtn")?.addEventListener("click", () => closeModal("contactModalBackdrop"));
  $("closeContactModalBtn")?.addEventListener("click", () => closeModal("contactModalBackdrop"));

  $("alertForm")?.addEventListener("submit", async (e) => {
    try {
      await saveAlertForm(e);
    } catch (err) {
      banner(err.message || "Could not save alert.");
    }
  });

  $("cancelAlertFormBtn")?.addEventListener("click", () => closeModal("alertModalBackdrop"));
  $("closeAlertModalBtn")?.addEventListener("click", () => closeModal("alertModalBackdrop"));

  [
    "youngPersonModalBackdrop",
    "contactModalBackdrop",
    "alertModalBackdrop"
  ].forEach(id => {
    $(id)?.addEventListener("click", (e) => {
      if (e.target?.id === id) closeModal(id);
    });
  });
}

async function init() {
  bindTabs();
  bindLayout();
  bindModals();

  try {
    await loadYoungPeople();
  } catch (e) {
    banner(e.message || "Could not load young people.");
  }
}

document.addEventListener("DOMContentLoaded", init);
