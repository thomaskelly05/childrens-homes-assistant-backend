let youngPeople = [];
let selectedYoungPerson = null;
let selectedOverview = null;
let activeProfileTab = "identity";

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });

  if (res.status === 401) {
    window.location.href = "/login";
    return null;
  }

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || data.error || detail;
    } catch {
      try {
        detail = await res.text();
      } catch {}
    }
    throw new Error(detail || "Request failed");
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

function safe(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function has(id) {
  return !!document.getElementById(id);
}

function $(id) {
  return document.getElementById(id);
}

function calcAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
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

function buildYoungPersonContextPayload(overview) {
  const yp = overview?.young_person || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  return {
    young_person_id: yp.id || null,
    young_person_name: fullName(yp),
    preferred_name: yp.preferred_name || yp.first_name || "",
    home_id: yp.home_id || null,
    home_name: yp.home_name || "",
    placement_status: yp.placement_status || "",
    risk_level: yp.summary_risk_level || "",
    communication_summary: communication.communication_style || communication.what_helps || "",
    education_summary: education.education_status || education.school_name || "",
    health_summary: health.mental_health_summary || health.medication_summary || "",
    active_alerts: alerts
      .filter(alert => alert && alert.is_active)
      .map(alert => alert.title)
      .filter(Boolean),
    saved_at: new Date().toISOString(),
  };
}

function storeYoungPersonContext(overview) {
  const payload = buildYoungPersonContextPayload(overview);
  localStorage.setItem(
    "indicare_selected_young_person_context",
    JSON.stringify(payload)
  );
  return payload;
}

function buildAssistantPrompt(action = "") {
  if (!selectedOverview?.young_person) return "";

  const context = buildYoungPersonContextPayload(selectedOverview);
  const actionMap = {
    "daily-note": "Write a factual daily note for this young person.",
    "handover": "Write a clear handover for the next shift for this young person.",
    "risk-review": "Review the current risks for this young person and suggest next steps.",
    "monthly-review": "Draft a monthly review summary for this young person.",
  };

  const actionLine =
    actionMap[action] || "Use this young person as the current working context.";

  const parts = [
    `Young person: ${context.young_person_name}`,
    `Preferred name: ${context.preferred_name || "—"}`,
    `Home: ${context.home_name || "—"}`,
    `Placement status: ${context.placement_status || "—"}`,
    `Risk level: ${context.risk_level || "—"}`,
    `Communication summary: ${context.communication_summary || "—"}`,
    `Education summary: ${context.education_summary || "—"}`,
    `Health summary: ${context.health_summary || "—"}`,
    context.active_alerts.length
      ? `Active alerts: ${context.active_alerts.join(", ")}`
      : "Active alerts: none recorded",
    "",
    actionLine,
  ];

  return parts.join("\n");
}

function sendContextToAssistant(action = "") {
  if (!selectedOverview?.young_person) {
    alert("Select a young person first.");
    return;
  }

  storeYoungPersonContext(selectedOverview);
  localStorage.setItem(
    "indicare_selected_assistant_prompt",
    buildAssistantPrompt(action)
  );

  window.location.href = "/assistant";
}

function renderYoungPersonList() {
  const host = $("youngPersonList");
  if (!host) return;

  const q = ($("youngPersonSearch")?.value || "").trim().toLowerCase();
  const filter = $("youngPersonStatusFilter")?.value || "";

  let rows = [...youngPeople];

  if (q) {
    rows = rows.filter(person => {
      const text = [
        person.first_name,
        person.last_name,
        person.preferred_name,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }

  if (filter === "active") rows = rows.filter(person => !person.archived);
  if (filter === "archived") rows = rows.filter(person => !!person.archived);

  if (!rows.length) {
    host.innerHTML = `<div class="empty-state">No matching young people found.</div>`;
    return;
  }

  host.innerHTML = rows
    .map(
      person => `
      <button
        class="person-card ${
          selectedYoungPerson && Number(selectedYoungPerson.id) === Number(person.id)
            ? "active"
            : ""
        }"
        data-id="${person.id}"
        type="button"
      >
        <div class="person-name">${safe(fullName(person))}</div>
        <div class="person-meta">
          DOB: ${safe(person.date_of_birth || "—")} · Age: ${safe(calcAge(person.date_of_birth))}<br>
          Placement: ${safe(person.placement_status || "—")}
        </div>
        <div class="tag-row">
          <span class="tag ${riskTagClass(person.summary_risk_level)}">${safe(
            person.summary_risk_level || "risk not set"
          )}</span>
          <span class="tag ${person.archived ? "warn" : "good"}">${
            person.archived ? "archived" : "active"
          }</span>
        </div>
      </button>
    `
    )
    .join("");

  host.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-id"));
      const person = youngPeople.find(x => Number(x.id) === id);
      if (!person) return;

      selectedYoungPerson = person;
      renderYoungPersonList();
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
  const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  panel.innerHTML = `
    <div class="hero">
      <div class="photo">
        ${
          yp.photo_url
            ? `<img src="${safe(yp.photo_url)}" alt="${safe(fullName(yp))}">`
            : safe(initials(yp))
        }
      </div>

      <div>
        <h3>${safe(fullName(yp))}</h3>
        <p>
          Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
          Date of birth: ${safe(yp.date_of_birth || "—")} · Age: ${safe(calcAge(yp.date_of_birth))}<br>
          Placement status: ${safe(yp.placement_status || "—")}
        </p>

        <div class="tag-row">
          <span class="tag ${riskTagClass(yp.summary_risk_level)}">${safe(
            yp.summary_risk_level || "risk not set"
          )}</span>
          <span class="tag">${safe(yp.gender || "gender not set")}</span>
          <span class="tag">${safe(yp.ethnicity || "ethnicity not set")}</span>
          <span class="tag ${yp.archived ? "warn" : "good"}">${
            yp.archived ? "archived" : "active"
          }</span>
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
            <div class="n">${safe(education.education_status || "—")}</div>
            <div class="l">Education</div>
          </div>
          <div class="stat">
            <div class="n">${safe(health.gp_name || "—")}</div>
            <div class="l">GP</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px;">
      <div class="card">
        <h3>Placement and identity</h3>
        <div class="kv"><div class="k">Home</div><div class="v">${safe(
          yp.home_name || yp.home_id || "—"
        )}</div></div>
        <div class="kv"><div class="k">Admission date</div><div class="v">${safe(
          yp.admission_date || "—"
        )}</div></div>
        <div class="kv"><div class="k">Discharge date</div><div class="v">${safe(
          yp.discharge_date || "—"
        )}</div></div>
        <div class="kv"><div class="k">Faith / religion</div><div class="v">${safe(
          identity.religion_or_faith || "—"
        )}</div></div>
        <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(
          identity.cultural_identity || "—"
        )}</div></div>
        <div class="kv"><div class="k">What matters</div><div class="v">${safe(
          identity.what_matters_to_me || "—"
        )}</div></div>
      </div>

      <div class="card">
        <h3>Communication and wellbeing</h3>
        <div class="kv"><div class="k">Communication style</div><div class="v">${safe(
          communication.communication_style || "—"
        )}</div></div>
        <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(
          communication.sensory_profile || "—"
        )}</div></div>
        <div class="kv"><div class="k">What helps</div><div class="v">${safe(
          communication.what_helps || "—"
        )}</div></div>
        <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(
          communication.what_to_avoid || "—"
        )}</div></div>
        <div class="kv"><div class="k">Mental health</div><div class="v">${safe(
          health.mental_health_summary || "—"
        )}</div></div>
        <div class="kv"><div class="k">Medication summary</div><div class="v">${safe(
          health.medication_summary || "—"
        )}</div></div>
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
  const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];
  const legalStatus = overview?.legal_status || {};

  if (activeProfileTab === "identity") {
    host.innerHTML = `
      <div class="card">
        <h3>Identity profile</h3>
        <div class="kv"><div class="k">Religion / faith</div><div class="v">${safe(
          identity.religion_or_faith || "—"
        )}</div></div>
        <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(
          identity.cultural_identity || "—"
        )}</div></div>
        <div class="kv"><div class="k">First language</div><div class="v">${safe(
          identity.first_language || "—"
        )}</div></div>
        <div class="kv"><div class="k">Dietary needs</div><div class="v">${safe(
          identity.dietary_needs || "—"
        )}</div></div>
        <div class="kv"><div class="k">Interests</div><div class="v">${safe(
          identity.interests || "—"
        )}</div></div>
        <div class="kv"><div class="k">Strengths</div><div class="v">${safe(
          identity.strengths_summary || "—"
        )}</div></div>
        <div class="kv"><div class="k">What matters to me</div><div class="v">${safe(
          identity.what_matters_to_me || "—"
        )}</div></div>
        <div class="kv"><div class="k">Important dates</div><div class="v">${safe(
          identity.important_dates || "—"
        )}</div></div>
        <div class="kv"><div class="k">Legal status</div><div class="v">${safe(
          legalStatus.legal_status || "—"
        )}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "communication") {
    host.innerHTML = `
      <div class="card">
        <h3>Communication profile</h3>
        <div class="kv"><div class="k">Neurodiversity summary</div><div class="v">${safe(
          communication.neurodiversity_summary || "—"
        )}</div></div>
        <div class="kv"><div class="k">Communication style</div><div class="v">${safe(
          communication.communication_style || "—"
        )}</div></div>
        <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(
          communication.sensory_profile || "—"
        )}</div></div>
        <div class="kv"><div class="k">Processing needs</div><div class="v">${safe(
          communication.processing_needs || "—"
        )}</div></div>
        <div class="kv"><div class="k">Signs of distress</div><div class="v">${safe(
          communication.signs_of_distress || "—"
        )}</div></div>
        <div class="kv"><div class="k">What helps</div><div class="v">${safe(
          communication.what_helps || "—"
        )}</div></div>
        <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(
          communication.what_to_avoid || "—"
        )}</div></div>
        <div class="kv"><div class="k">Routines and predictability</div><div class="v">${safe(
          communication.routines_and_predictability || "—"
        )}</div></div>
        <div class="kv"><div class="k">Visual support needs</div><div class="v">${safe(
          communication.visual_support_needs || "—"
        )}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "education") {
    host.innerHTML = `
      <div class="card">
        <h3>Education profile</h3>
        <div class="kv"><div class="k">School</div><div class="v">${safe(
          education.school_name || "—"
        )}</div></div>
        <div class="kv"><div class="k">Year group</div><div class="v">${safe(
          education.year_group || "—"
        )}</div></div>
        <div class="kv"><div class="k">Education status</div><div class="v">${safe(
          education.education_status || "—"
        )}</div></div>
        <div class="kv"><div class="k">SEN status</div><div class="v">${safe(
          education.sen_status || "—"
        )}</div></div>
        <div class="kv"><div class="k">EHCP details</div><div class="v">${safe(
          education.ehcp_details || "—"
        )}</div></div>
        <div class="kv"><div class="k">Designated teacher</div><div class="v">${safe(
          education.designated_teacher || "—"
        )}</div></div>
        <div class="kv"><div class="k">Attendance baseline</div><div class="v">${safe(
          education.attendance_baseline || "—"
        )}</div></div>
        <div class="kv"><div class="k">PEP status</div><div class="v">${safe(
          education.pep_status || "—"
        )}</div></div>
        <div class="kv"><div class="k">Support summary</div><div class="v">${safe(
          education.support_summary || "—"
        )}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "health") {
    host.innerHTML = `
      <div class="card">
        <h3>Health profile</h3>
        <div class="kv"><div class="k">GP</div><div class="v">${safe(
          health.gp_name || "—"
        )}</div></div>
        <div class="kv"><div class="k">GP contact</div><div class="v">${safe(
          health.gp_contact || "—"
        )}</div></div>
        <div class="kv"><div class="k">Dentist</div><div class="v">${safe(
          health.dentist_name || "—"
        )}</div></div>
        <div class="kv"><div class="k">Optician</div><div class="v">${safe(
          health.optician_name || "—"
        )}</div></div>
        <div class="kv"><div class="k">Allergies</div><div class="v">${safe(
          health.allergies || "—"
        )}</div></div>
        <div class="kv"><div class="k">Diagnoses</div><div class="v">${safe(
          health.diagnoses || "—"
        )}</div></div>
        <div class="kv"><div class="k">Mental health summary</div><div class="v">${safe(
          health.mental_health_summary || "—"
        )}</div></div>
        <div class="kv"><div class="k">Medication summary</div><div class="v">${safe(
          health.medication_summary || "—"
        )}</div></div>
        <div class="kv"><div class="k">Consent notes</div><div class="v">${safe(
          health.consent_notes || "—"
        )}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "contacts") {
    host.innerHTML = contacts.length
      ? `
      <div class="mini-list">
        ${contacts
          .map(
            contact => `
          <div class="mini-item">
            <strong>${safe(contact.full_name || "Unnamed contact")}</strong>
            <p>
              ${safe(contact.relationship_to_young_person || "Relationship not set")} · ${safe(
              contact.contact_type || "contact"
            )}<br>
              Phone: ${safe(contact.phone || "—")} · Email: ${safe(contact.email || "—")}<br>
              Supervision: ${safe(contact.supervision_level || "—")}
            </p>
          </div>
        `
          )
          .join("")}
      </div>
    `
      : `<div class="empty-state">No contacts recorded yet.</div>`;
    return;
  }

  if (activeProfileTab === "alerts") {
    host.innerHTML = alerts.length
      ? `
      <div class="mini-list">
        ${alerts
          .map(
            alert => `
          <div class="mini-item">
            <strong>${safe(alert.title || "Alert")}</strong>
            <p>
              ${safe(alert.alert_type || "alert")} · ${safe(alert.severity || "severity not set")}<br>
              ${safe(alert.description || "No description")}<br>
              Review date: ${safe(alert.review_date || "—")} · ${
              alert.is_active ? "active" : "inactive"
            }
            </p>
          </div>
        `
          )
          .join("")}
      </div>
    `
      : `<div class="empty-state">No alerts recorded yet.</div>`;
  }
}

function renderAssistantContext(overview) {
  const yp = overview?.young_person || selectedYoungPerson || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const box = $("assistantContextBox");
  if (!box) return;

  box.innerHTML = `
    <strong style="display:block;margin-bottom:8px;color:var(--text);">Assistant context for ${safe(
      fullName(yp)
    )}</strong>
    Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
    Placement status: ${safe(yp.placement_status || "—")}<br>
    Risk level: ${safe(yp.summary_risk_level || "—")}<br>
    Communication: ${safe(communication.communication_style || "—")}<br>
    What helps: ${safe(communication.what_helps || "—")}<br>
    Education: ${safe(education.education_status || "—")}<br>
    Health / mental health: ${safe(health.mental_health_summary || "—")}
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
  if (!data) return;

  youngPeople = Array.isArray(data?.young_people) ? data.young_people : [];
  renderYoungPersonList();

  if (!selectedYoungPerson && youngPeople.length) {
    selectedYoungPerson = youngPeople[0];
    renderYoungPersonList();
    await loadYoungPersonOverview(selectedYoungPerson.id);
  }
}

async function loadYoungPersonOverview(id) {
  const data = await api(`/young-people/${id}/overview`);
  if (!data) return;

  const overview = data?.overview || {};
  selectedOverview = overview;
  selectedYoungPerson = overview?.young_person || selectedYoungPerson;

  if (has("pageTitle")) {
    $("pageTitle").textContent = fullName(selectedYoungPerson);
  }

  if (has("pageSubtitle")) {
    $("pageSubtitle").textContent =
      `Placement: ${selectedYoungPerson?.placement_status || "—"} · Risk: ${
        selectedYoungPerson?.summary_risk_level || "—"
      }`;
  }

  storeYoungPersonContext(overview);
  renderOverview(overview);
}

function bindTabs() {
  document.querySelectorAll("[data-profile-tab]").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("[data-profile-tab]").forEach(x => {
        x.classList.remove("active");
      });

      btn.classList.add("active");
      activeProfileTab = btn.getAttribute("data-profile-tab") || "identity";

      if (selectedYoungPerson?.id) {
        await loadYoungPersonOverview(selectedYoungPerson.id);
      }
    });
  });
}

function bindLayout() {
  const sidebar = $("ypSidebar");

  $("openSidebarBtn")?.addEventListener("click", () => {
    sidebar?.classList.add("open");
  });

  $("closeSidebarBtn")?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
  });

  $("refreshYoungPeopleBtn")?.addEventListener("click", loadYoungPeople);
  $("youngPersonSearch")?.addEventListener("input", renderYoungPersonList);
  $("youngPersonStatusFilter")?.addEventListener("change", renderYoungPersonList);

  $("newYoungPersonBtn")?.addEventListener("click", () => {
    alert("Next step: connect this button to your create young person form or modal.");
  });

  $("openAssistantBtn")?.addEventListener("click", () => {
    sendContextToAssistant("");
  });

  document.querySelectorAll("[data-assistant-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-assistant-action") || "";
      sendContextToAssistant(action);
    });
  });
}

async function init() {
  bindTabs();
  bindLayout();
  await loadYoungPeople();
}

document.addEventListener("DOMContentLoaded", init);
