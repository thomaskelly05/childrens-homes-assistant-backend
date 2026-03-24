let youngPeople = [];
let selectedYoungPerson = null;
let activeProfileTab = "identity";
let selectedOverview = null;

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
    } catch {}
    throw new Error(detail);
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

function buildAssistantContext(overview) {
  const yp = overview?.young_person || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  return {
    young_person_id: yp.id || null,
    young_person_name: [yp.first_name, yp.last_name].filter(Boolean).join(" ").trim(),
    preferred_name: yp.preferred_name || yp.first_name || "",
    home_id: yp.home_id || null,
    home_name: yp.home_name || "",
    placement_status: yp.placement_status || "",
    risk_level: yp.summary_risk_level || "",
    active_alerts: alerts.filter(a => a.is_active).map(a => a.title).filter(Boolean),
    communication_summary: communication.what_helps || communication.communication_style || "",
    health_summary: health.mental_health_summary || health.medication_summary || "",
    education_summary: education.support_summary || education.education_status || ""
  };
}

function storeAssistantContext(overview) {
  try {
    const context = buildAssistantContext(overview);
    localStorage.setItem("indicare_selected_young_person_context", JSON.stringify(context));
  } catch (error) {
    console.error("Could not store assistant context", error);
  }
}

function buildAssistantPrompt(actionName) {
  const yp = selectedOverview?.young_person || selectedYoungPerson || {};
  const communication = selectedOverview?.communication_profile || {};
  const education = selectedOverview?.education_profile || {};
  const health = selectedOverview?.health_profile || {};
  const alerts = Array.isArray(selectedOverview?.alerts) ? selectedOverview.alerts : [];

  const actionMap = {
    "daily-note": "Write a daily note for this young person.",
    "handover": "Write a handover for this young person.",
    "risk-review": "Review the current risks and suggest next steps for this young person.",
    "monthly-review": "Draft a monthly review summary for this young person."
  };

  const promptLines = [
    actionMap[actionName] || "Use this young person as the current working context.",
    "",
    `Young person: ${fullName(yp)}`,
    `Preferred name: ${yp.preferred_name || yp.first_name || ""}`,
    `Home: ${yp.home_name || yp.home_id || ""}`,
    `Placement status: ${yp.placement_status || ""}`,
    `Risk level: ${yp.summary_risk_level || ""}`,
    `Communication summary: ${communication.what_helps || communication.communication_style || ""}`,
    `Education summary: ${education.support_summary || education.education_status || ""}`,
    `Health summary: ${health.mental_health_summary || health.medication_summary || ""}`,
    `Active alerts: ${alerts.filter(a => a.is_active).map(a => a.title).join(", ") || "None recorded"}`,
    "",
    "Keep the response specific to this young person and suitable for residential care practice."
  ];

  return promptLines.join("\n");
}

function renderYoungPersonList() {
  const host = document.getElementById("youngPersonList");
  const q = (document.getElementById("youngPersonSearch")?.value || "").trim().toLowerCase();
  const filter = document.getElementById("youngPersonStatusFilter")?.value || "";

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
      await loadYoungPersonOverview(id);

      const sidebar = document.getElementById("ypSidebar");
      if (window.innerWidth <= 820 && sidebar) {
        sidebar.classList.remove("open");
      }
    });
  });
}

function renderOverview(overview) {
  const panel = document.getElementById("overviewPanel");
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
        <div class="kv"><div class="k">Home ID</div><div class="v">${safe(yp.home_id || "—")}</div></div>
        <div class="kv"><div class="k">Home name</div><div class="v">${safe(yp.home_name || "—")}</div></div>
        <div class="kv"><div class="k">Admission date</div><div class="v">${safe(yp.admission_date || "—")}</div></div>
        <div class="kv"><div class="k">Discharge date</div><div class="v">${safe(yp.discharge_date || "—")}</div></div>
        <div class="kv"><div class="k">Faith / religion</div><div class="v">${safe(identity.religion_or_faith || "—")}</div></div>
        <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(identity.cultural_identity || "—")}</div></div>
        <div class="kv"><div class="k">What matters</div><div class="v">${safe(identity.what_matters_to_me || "—")}</div></div>
      </div>

      <div class="card">
        <h3>Communication and wellbeing</h3>
        <div class="kv"><div class="k">Communication style</div><div class="v">${safe(communication.communication_style || "—")}</div></div>
        <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(communication.sensory_profile || "—")}</div></div>
        <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
        <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(communication.what_to_avoid || "—")}</div></div>
        <div class="kv"><div class="k">Mental health</div><div class="v">${safe(health.mental_health_summary || "—")}</div></div>
        <div class="kv"><div class="k">Medication summary</div><div class="v">${safe(health.medication_summary || "—")}</div></div>
      </div>
    </div>
  `;

  renderProfileTab(overview);
  renderAssistantContext(overview);
  renderTimelinePlaceholder(overview);
}

function renderProfileTab(overview) {
  const host = document.getElementById("profileTabContent");
  const identity = overview?.identity_profile || {};
  const communication = overview?.communication_profile || {};
  const education = overview?.education_profile || {};
  const health = overview?.health_profile || {};
  const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

  if (activeProfileTab === "identity") {
    host.innerHTML = `
      <div class="card">
        <h3>Identity profile</h3>
        <div class="kv"><div class="k">Religion / faith</div><div class="v">${safe(identity.religion_or_faith || "—")}</div></div>
        <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(identity.cultural_identity || "—")}</div></div>
        <div class="kv"><div class="k">First language</div><div class="v">${safe(identity.first_language || "—")}</div></div>
        <div class="kv"><div class="k">Dietary needs</div><div class="v">${safe(identity.dietary_needs || "—")}</div></div>
        <div class="kv"><div class="k">Interests</div><div class="v">${safe(identity.interests || "—")}</div></div>
        <div class="kv"><div class="k">Strengths</div><div class="v">${safe(identity.strengths_summary || "—")}</div></div>
        <div class="kv"><div class="k">What matters to me</div><div class="v">${safe(identity.what_matters_to_me || "—")}</div></div>
        <div class="kv"><div class="k">Important dates</div><div class="v">${safe(identity.important_dates || "—")}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "communication") {
    host.innerHTML = `
      <div class="card">
        <h3>Communication profile</h3>
        <div class="kv"><div class="k">Neurodiversity summary</div><div class="v">${safe(communication.neurodiversity_summary || "—")}</div></div>
        <div class="kv"><div class="k">Communication style</div><div class="v">${safe(communication.communication_style || "—")}</div></div>
        <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(communication.sensory_profile || "—")}</div></div>
        <div class="kv"><div class="k">Processing needs</div><div class="v">${safe(communication.processing_needs || "—")}</div></div>
        <div class="kv"><div class="k">Signs of distress</div><div class="v">${safe(communication.signs_of_distress || "—")}</div></div>
        <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
        <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(communication.what_to_avoid || "—")}</div></div>
        <div class="kv"><div class="k">Routines and predictability</div><div class="v">${safe(communication.routines_and_predictability || "—")}</div></div>
        <div class="kv"><div class="k">Visual support needs</div><div class="v">${safe(communication.visual_support_needs || "—")}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "education") {
    host.innerHTML = `
      <div class="card">
        <h3>Education profile</h3>
        <div class="kv"><div class="k">School</div><div class="v">${safe(education.school_name || "—")}</div></div>
        <div class="kv"><div class="k">Year group</div><div class="v">${safe(education.year_group || "—")}</div></div>
        <div class="kv"><div class="k">Education status</div><div class="v">${safe(education.education_status || "—")}</div></div>
        <div class="kv"><div class="k">SEN status</div><div class="v">${safe(education.sen_status || "—")}</div></div>
        <div class="kv"><div class="k">EHCP details</div><div class="v">${safe(education.ehcp_details || "—")}</div></div>
        <div class="kv"><div class="k">Designated teacher</div><div class="v">${safe(education.designated_teacher || "—")}</div></div>
        <div class="kv"><div class="k">Attendance baseline</div><div class="v">${safe(education.attendance_baseline || "—")}</div></div>
        <div class="kv"><div class="k">PEP status</div><div class="v">${safe(education.pep_status || "—")}</div></div>
        <div class="kv"><div class="k">Support summary</div><div class="v">${safe(education.support_summary || "—")}</div></div>
      </div>
    `;
    return;
  }

  if (activeProfileTab === "health") {
    host.innerHTML = `
      <div class="card">
        <h3>Health profile</h3>
        <div class="kv"><div class="k">GP</div><div class="v">${safe(health.gp_name || "—")}</div></div>
        <div class="kv"><div class="k">GP contact</div><div class="v">${safe(health.gp_contact || "—")}</div></div>
        <div class="kv"><div class="k">Dentist</div><div class="v">${safe(health.dentist_name || "—")}</div></div>
        <div class="kv"><div class="k">Optician</div><div class="v">${safe(health.optician_name || "—")}</div></div>
        <div class="kv"><div class="k">Allergies</div><div class="v">${safe(health.allergies || "—")}</div></div>
        <div class="kv"><div class="k">Diagnoses</div><div class="v">${safe(health.diagnoses || "—")}</div></div>
        <div class="kv"><div class="k">Mental health summary</div><div class="v">${safe(health.mental_health_summary || "—")}</div></div>
        <div class="kv"><div class="k">Medication summary</div><div class="v">${safe(health.medication_summary || "—")}</div></div>
        <div class="kv"><div class="k">Consent notes</div><div class="v">${safe(health.consent_notes || "—")}</div></div>
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
              Supervision: ${safe(contact.supervision_level || "—")}
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
              Review date: ${safe(alert.review_date || "—")} · ${alert.is_active ? "active" : "inactive"}
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
  const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];
  const box = document.getElementById("assistantContextBox");

  box.innerHTML = `
    <strong style="display:block;margin-bottom:8px;color:var(--text);">Assistant context for ${safe(fullName(yp))}</strong>
    Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
    Placement status: ${safe(yp.placement_status || "—")}<br>
    Risk level: ${safe(yp.summary_risk_level || "—")}<br>
    Communication: ${safe(communication.communication_style || "—")}<br>
    What helps: ${safe(communication.what_helps || "—")}<br>
    Education: ${safe(education.education_status || "—")}<br>
    Health / mental health: ${safe(health.mental_health_summary || "—")}<br>
    Active alerts: ${safe(alerts.filter(a => a.is_active).map(a => a.title).join(", ") || "None recorded")}
  `;
}

function renderTimelinePlaceholder(overview) {
  const host = document.getElementById("timelinePanel");
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

  if (!selectedYoungPerson && youngPeople.length) {
    selectedYoungPerson = youngPeople[0];
    renderYoungPersonList();
    await loadYoungPersonOverview(selectedYoungPerson.id);
    return;
  }

  if (selectedYoungPerson?.id) {
    const fresh = youngPeople.find(p => Number(p.id) === Number(selectedYoungPerson.id));
    if (fresh) {
      selectedYoungPerson = fresh;
      renderYoungPersonList();
    }
  }
}

async function loadYoungPersonOverview(id) {
  const data = await api(`/young-people/${id}/overview`);
  const overview = data?.overview || {};
  selectedOverview = overview;
  selectedYoungPerson = overview?.young_person || selectedYoungPerson;

  document.getElementById("pageTitle").textContent = fullName(selectedYoungPerson);
  document.getElementById("pageSubtitle").textContent =
    `Placement: ${selectedYoungPerson?.placement_status || "—"} · Risk: ${selectedYoungPerson?.summary_risk_level || "—"}`;

  storeAssistantContext(overview);
  renderOverview(overview);
}

function bindTabs() {
  document.querySelectorAll("[data-profile-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-profile-tab]").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      activeProfileTab = btn.getAttribute("data-profile-tab");

      if (selectedOverview) {
        renderProfileTab(selectedOverview);
      }
    });
  });
}

function bindLayout() {
  const sidebar = document.getElementById("ypSidebar");

  document.getElementById("openSidebarBtn")?.addEventListener("click", () => {
    sidebar?.classList.add("open");
  });

  document.getElementById("closeSidebarBtn")?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
  });

  document.getElementById("refreshYoungPeopleBtn")?.addEventListener("click", async () => {
    await loadYoungPeople();
    if (selectedYoungPerson?.id) {
      await loadYoungPersonOverview(selectedYoungPerson.id);
    }
  });

  document.getElementById("youngPersonSearch")?.addEventListener("input", renderYoungPersonList);
  document.getElementById("youngPersonStatusFilter")?.addEventListener("change", renderYoungPersonList);

  document.getElementById("newYoungPersonBtn")?.addEventListener("click", () => {
    alert("Next step: connect this button to your create young person form or modal.");
  });

  document.getElementById("openAssistantBtn")?.addEventListener("click", () => {
    if (!selectedYoungPerson) {
      alert("Select a young person first.");
      return;
    }

    window.location.href = "/assistant";
  });

  document.querySelectorAll("[data-assistant-action]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!selectedYoungPerson) {
        alert("Select a young person first.");
        return;
      }

      const action = btn.getAttribute("data-assistant-action");
      const prompt = buildAssistantPrompt(action);

      try {
        localStorage.setItem("indicare_selected_assistant_prompt", prompt);
        window.location.href = "/assistant";
      } catch (error) {
        console.error("Could not store assistant prompt", error);
        alert("Could not prepare assistant prompt.");
      }
    });
  });
}

async function init() {
  bindTabs();
  bindLayout();
  await loadYoungPeople();
}

document.addEventListener("DOMContentLoaded", init);
