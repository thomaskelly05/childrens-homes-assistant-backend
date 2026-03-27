window.ChildrensHomeOS = (function () {
  let youngPeople = [];
  let filteredYoungPeople = [];
  let selectedYoungPerson = null;
  let latestOverview = null;

  let activeProfileTab = "identity";
  let activeSectionTab = "overview";
  let activeShiftMode = "during";

  const SECTION_IDS = [
    "overview",
    "daily-notes",
    "incidents",
    "health",
    "education",
    "family",
    "keywork",
    "risk",
    "timeline"
  ];

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {})
      }
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const data = await response.json();
        message = data?.detail || data?.error || message;
      } catch {}
      throw new Error(message);
    }

    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  function safe(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fullName(person) {
    const first = person?.preferred_name || person?.first_name || "";
    const last = person?.last_name || "";
    return [first, last].filter(Boolean).join(" ").trim() || "Unnamed young person";
  }

  function initials(person) {
    const first = (person?.preferred_name || person?.first_name || "").trim();
    const last = (person?.last_name || "").trim();
    return ((first[0] || "") + (last[0] || "")).toUpperCase() || "YP";
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

  function riskTagClass(level) {
    const text = String(level || "").toLowerCase();
    if (["high", "significant", "severe", "critical"].includes(text)) return "danger";
    if (["medium", "moderate"].includes(text)) return "warn";
    if (["low", "stable"].includes(text)) return "good";
    return "";
  }

  function getSectionTitle(section) {
    const map = {
      overview: "Overview",
      "daily-notes": "Daily notes",
      incidents: "Incidents",
      health: "Health",
      education: "Education",
      family: "Family",
      keywork: "Keywork",
      risk: "Risk",
      timeline: "Timeline"
    };
    return map[section] || "Overview";
  }

  function setActiveShiftMode(mode) {
    activeShiftMode = mode;

    document.querySelectorAll("[data-shift-mode]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-shift-mode") === mode);
    });

    renderContextStrip();
  }

  function setActiveSectionTab(section) {
    activeSectionTab = section;

    document.querySelectorAll("[data-section-tab]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-section-tab") === section);
    });

    document.querySelectorAll(".section-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `section-${section}`);
    });

    renderContextStrip();
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  function closeAllModals() {
    document.querySelectorAll(".modal").forEach(closeModal);
  }

  function renderYoungPersonSelect() {
    const select = document.getElementById("youngPersonSelect");
    if (!select) return;

    const currentId = selectedYoungPerson?.id ? String(selectedYoungPerson.id) : "";
    select.innerHTML = `<option value="">Select young person</option>`;

    if (!filteredYoungPeople.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No young people match your filters";
      select.appendChild(option);
      select.value = "";
      return;
    }

    filteredYoungPeople.forEach(person => {
      const option = document.createElement("option");
      option.value = String(person.id);
      option.textContent = `${fullName(person)}${person.archived ? " (Archived)" : ""}`;
      select.appendChild(option);
    });

    if ([...select.options].some(opt => opt.value === currentId)) {
      select.value = currentId;
    } else {
      select.value = "";
    }
  }

  function applyYoungPersonFilters() {
    const query = (document.getElementById("youngPersonSearch")?.value || "").trim().toLowerCase();
    const status = document.getElementById("youngPersonStatusFilter")?.value || "";

    let rows = [...youngPeople];

    if (query) {
      rows = rows.filter(person => {
        const haystack = [
          person.first_name,
          person.last_name,
          person.preferred_name,
          person.placement_status,
          person.summary_risk_level
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    if (status === "active") {
      rows = rows.filter(person => !person.archived);
    }

    if (status === "archived") {
      rows = rows.filter(person => !!person.archived);
    }

    filteredYoungPeople = rows;
    renderYoungPersonSelect();

    if (
      selectedYoungPerson &&
      !filteredYoungPeople.some(person => Number(person.id) === Number(selectedYoungPerson.id))
    ) {
      selectedYoungPerson = null;
      latestOverview = null;
      clearDashboard();
    }
  }

  function renderContextStrip() {
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const contextTags = document.getElementById("contextTags");

    if (!pageTitle || !pageSubtitle || !contextTags) return;

    if (!selectedYoungPerson) {
      pageTitle.textContent = "Young Person OS";
      pageSubtitle.textContent = "Select a young person to begin.";
      contextTags.innerHTML = "";
      return;
    }

    pageTitle.textContent = `${fullName(selectedYoungPerson)} · ${getSectionTitle(activeSectionTab)}`;

    const shiftText =
      activeShiftMode === "start"
        ? "Start shift"
        : activeShiftMode === "end"
          ? "End shift"
          : "During shift";

    pageSubtitle.textContent =
      latestOverview?.identity_profile?.what_matters_to_me ||
      "Use the tabs to focus on one area at a time and keep recording clear and manageable.";

    const legal = latestOverview?.legal_status || {};

    contextTags.innerHTML = `
      <span class="tag ${riskTagClass(selectedYoungPerson.summary_risk_level)}">${safe(selectedYoungPerson.summary_risk_level || "risk not set")}</span>
      <span class="tag ${selectedYoungPerson.archived ? "warn" : "good"}">${selectedYoungPerson.archived ? "archived" : "active"}</span>
      <span class="tag">${safe(selectedYoungPerson.placement_status || "placement not set")}</span>
      <span class="tag">${safe(selectedYoungPerson.primary_keyworker_name || "keyworker not allocated")}</span>
      <span class="tag">${safe(legal.legal_status || legal.order_type || "legal status not recorded")}</span>
      <span class="tag">${safe(shiftText)}</span>
    `;
  }

  function clearSectionBodies() {
    const ids = [
      "dailyNotesSection",
      "incidentsSection",
      "healthSection",
      "educationSection",
      "familySection",
      "keyworkSection",
      "riskSection",
      "timelineSection"
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `<div class="empty-state">Select a young person to view this area.</div>`;
      }
    });
  }

  function clearDashboard() {
    const overviewPanel = document.getElementById("overviewPanel");
    const profileTabContent = document.getElementById("profileTabContent");
    const assistantContextBox = document.getElementById("assistantContextBox");
    const liveRightRail = document.getElementById("liveRightRail");

    if (overviewPanel) {
      overviewPanel.innerHTML = `<div class="empty-state">Select a young person to open their dashboard.</div>`;
    }

    if (profileTabContent) {
      profileTabContent.innerHTML = `<div class="empty-state compact">Profile content will appear here once a young person is selected.</div>`;
    }

    if (assistantContextBox) {
      assistantContextBox.innerHTML = `Choose a young person and this area will hold live assistant context and suggested actions.`;
    }

    if (liveRightRail) {
      liveRightRail.innerHTML = `
        <div class="snapshot-item">
          <div class="snapshot-title">Current priorities</div>
          <div class="snapshot-text">Select a young person to surface alerts, risks, tasks, reviews, and follow-up.</div>
        </div>
      `;
    }

    renderContextStrip();
    renderYoungPersonSelect();
    clearSectionBodies();
    setActiveSectionTab(activeSectionTab);
  }

  function renderOverview(overview) {
    const panel = document.getElementById("overviewPanel");
    if (!panel) return;

    const yp = overview?.young_person || selectedYoungPerson || {};
    const identity = overview?.identity_profile || {};
    const communication = overview?.communication_profile || {};
    const education = overview?.education_profile || {};
    const health = overview?.health_profile || {};
    const legal = overview?.legal_status || {};
    const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];
    const activeAlerts = alerts.filter(alert => alert?.is_active);
    const priorityAlerts = activeAlerts.slice(0, 4);

    panel.innerHTML = `
      <div class="overview-shell">
        <div class="overview-header">
          <div class="overview-header-main">
            <div class="overview-photo">
              ${yp.photo_url ? `<img src="${safe(yp.photo_url)}" alt="${safe(fullName(yp))}">` : safe(initials(yp))}
            </div>

            <div class="overview-identity">
              <div class="overview-title-row">
                <h3>${safe(fullName(yp))}</h3>
                <div class="tag-row">
                  <span class="tag ${riskTagClass(yp.summary_risk_level)}">${safe(yp.summary_risk_level || "risk not set")}</span>
                  <span class="tag ${yp.archived ? "warn" : "good"}">${yp.archived ? "archived" : "active"}</span>
                  <span class="tag">${safe(yp.placement_status || "placement not set")}</span>
                </div>
              </div>

              <div class="overview-subtext">
                Preferred name: <strong>${safe(yp.preferred_name || yp.first_name || "—")}</strong> ·
                DOB: <strong>${safe(yp.date_of_birth || "—")}</strong> ·
                Age: <strong>${safe(calcAge(yp.date_of_birth))}</strong>
              </div>

              <div class="overview-subtext">
                Keyworker: <strong>${safe(yp.primary_keyworker_name || "Not allocated")}</strong> ·
                Legal status: <strong>${safe(legal.legal_status || legal.order_type || "Not recorded")}</strong>
              </div>

              <div class="overview-human-strip">
                <div class="human-card">
                  <div class="human-card-label">What matters to me</div>
                  <div class="human-card-text">${safe(identity.what_matters_to_me || "Not recorded yet.")}</div>
                </div>
                <div class="human-card">
                  <div class="human-card-label">How best to support me</div>
                  <div class="human-card-text">${safe(communication.what_helps || "Not recorded yet.")}</div>
                </div>
                <div class="human-card">
                  <div class="human-card-label">Early signs I am struggling</div>
                  <div class="human-card-text">${safe(communication.signs_of_distress || "Not recorded yet.")}</div>
                </div>
                <div class="human-card">
                  <div class="human-card-label">What adults should avoid</div>
                  <div class="human-card-text">${safe(communication.what_to_avoid || "Not recorded yet.")}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="overview-alerts">
            <div class="overview-side-card">
              <div class="overview-side-title">Active alerts</div>
              ${
                priorityAlerts.length
                  ? priorityAlerts.map(alert => `
                    <div class="alert-line">
                      <div class="alert-line-title">${safe(alert.title || "Alert")}</div>
                      <div class="alert-line-meta">
                        <span class="tag ${riskTagClass(alert.severity)}">${safe(alert.severity || "alert")}</span>
                        <span>${safe(alert.alert_type || "general")}</span>
                      </div>
                    </div>
                  `).join("")
                  : `<div class="snapshot-text">No active alerts recorded.</div>`
              }
            </div>
          </div>
        </div>

        <div class="overview-stat-grid">
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(activeAlerts.length))}</div>
            <div class="overview-stat-label">Active alerts</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.daily_note_count ?? 0))}</div>
            <div class="overview-stat-label">Daily notes</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.incident_count ?? 0))}</div>
            <div class="overview-stat-label">Incidents</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.active_risk_count ?? 0))}</div>
            <div class="overview-stat-label">Active risks</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.active_support_plan_count ?? 0))}</div>
            <div class="overview-stat-label">Active plans</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.open_task_count ?? 0))}</div>
            <div class="overview-stat-label">Open tasks</div>
          </div>
        </div>

        <div class="overview-info-grid">
          <div class="card">
            <h3>Identity and belonging</h3>
            <div class="kv"><div class="k">Gender</div><div class="v">${safe(yp.gender || "—")}</div></div>
            <div class="kv"><div class="k">Ethnicity</div><div class="v">${safe(yp.ethnicity || "—")}</div></div>
            <div class="kv"><div class="k">Faith / religion</div><div class="v">${safe(identity.religion_or_faith || "—")}</div></div>
            <div class="kv"><div class="k">Culture</div><div class="v">${safe(identity.cultural_identity || "—")}</div></div>
            <div class="kv"><div class="k">First language</div><div class="v">${safe(identity.first_language || "—")}</div></div>
            <div class="kv"><div class="k">Important dates</div><div class="v">${safe(identity.important_dates || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Communication and regulation</h3>
            <div class="kv"><div class="k">Communication style</div><div class="v">${safe(communication.communication_style || "—")}</div></div>
            <div class="kv"><div class="k">Processing needs</div><div class="v">${safe(communication.processing_needs || "—")}</div></div>
            <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(communication.sensory_profile || "—")}</div></div>
            <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
            <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(communication.what_to_avoid || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Health and education</h3>
            <div class="kv"><div class="k">School</div><div class="v">${safe(education.school_name || "—")}</div></div>
            <div class="kv"><div class="k">Education status</div><div class="v">${safe(education.education_status || "—")}</div></div>
            <div class="kv"><div class="k">SEN status</div><div class="v">${safe(education.sen_status || "—")}</div></div>
            <div class="kv"><div class="k">GP</div><div class="v">${safe(health.gp_name || "—")}</div></div>
            <div class="kv"><div class="k">Allergies</div><div class="v">${safe(health.allergies || "—")}</div></div>
            <div class="kv"><div class="k">Mental health</div><div class="v">${safe(health.mental_health_summary || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Care and legal context</h3>
            <div class="kv"><div class="k">Placement</div><div class="v">${safe(yp.placement_status || "—")}</div></div>
            <div class="kv"><div class="k">Admission date</div><div class="v">${safe(yp.admission_date || "—")}</div></div>
            <div class="kv"><div class="k">Discharge date</div><div class="v">${safe(yp.discharge_date || "—")}</div></div>
            <div class="kv"><div class="k">Legal status</div><div class="v">${safe(legal.legal_status || "—")}</div></div>
            <div class="kv"><div class="k">Order type</div><div class="v">${safe(legal.order_type || "—")}</div></div>
            <div class="kv"><div class="k">Consent</div><div class="v">${safe(legal.consent_arrangements || "—")}</div></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfileTab(overview) {
    const host = document.getElementById("profileTabContent");
    if (!host) return;

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
          <div class="kv"><div class="k">Signs of distress</div><div class="v">${safe(communication.signs_of_distress || "—")}</div></div>
          <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
          <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(communication.what_to_avoid || "—")}</div></div>
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
          <div class="kv"><div class="k">Status</div><div class="v">${safe(education.education_status || "—")}</div></div>
          <div class="kv"><div class="k">SEN status</div><div class="v">${safe(education.sen_status || "—")}</div></div>
          <div class="kv"><div class="k">EHCP</div><div class="v">${safe(education.ehcp_details || "—")}</div></div>
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
          <div class="kv"><div class="k">Dentist</div><div class="v">${safe(health.dentist_name || "—")}</div></div>
          <div class="kv"><div class="k">Optician</div><div class="v">${safe(health.optician_name || "—")}</div></div>
          <div class="kv"><div class="k">Allergies</div><div class="v">${safe(health.allergies || "—")}</div></div>
          <div class="kv"><div class="k">Diagnoses</div><div class="v">${safe(health.diagnoses || "—")}</div></div>
          <div class="kv"><div class="k">Medication</div><div class="v">${safe(health.medication_summary || "—")}</div></div>
        </div>
      `;
      return;
    }

    if (activeProfileTab === "contacts") {
      host.innerHTML = `
        <div class="card">
          <h3>Contacts</h3>
          ${
            contacts.length
              ? contacts.map(contact => `
                <div class="mini-item">
                  <strong>${safe(contact.full_name || "Unnamed contact")}</strong>
                  <p>
                    ${safe(contact.relationship_to_young_person || "Relationship not set")} · ${safe(contact.contact_type || "contact")}<br>
                    Phone: ${safe(contact.phone || "—")} · Email: ${safe(contact.email || "—")}<br>
                    Supervision: ${safe(contact.supervision_level || "—")}
                  </p>
                </div>
              `).join("")
              : `<div class="empty-state compact">No contacts recorded yet.</div>`
          }
        </div>
      `;
      return;
    }

    host.innerHTML = `
      <div class="card">
        <h3>Alerts</h3>
        ${
          alerts.length
            ? alerts.map(alert => `
              <div class="mini-item">
                <strong>${safe(alert.title || "Alert")}</strong>
                <p>
                  ${safe(alert.alert_type || "alert")} · ${safe(alert.severity || "severity not set")}<br>
                  ${safe(alert.description || "No description")}<br>
                  Review date: ${safe(alert.review_date || "—")} · ${alert.is_active ? "active" : "inactive"}
                </p>
              </div>
            `).join("")
            : `<div class="empty-state compact">No alerts recorded yet.</div>`
        }
      </div>
    `;
  }

  function renderAssistantContext(overview) {
    const host = document.getElementById("assistantContextBox");
    if (!host) return;

    const yp = overview?.young_person || selectedYoungPerson || {};
    const communication = overview?.communication_profile || {};
    const health = overview?.health_profile || {};
    const education = overview?.education_profile || {};

    host.innerHTML = `
      <strong>Assistant context for ${safe(fullName(yp))}</strong><br><br>
      Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
      Placement: ${safe(yp.placement_status || "—")}<br>
      Risk level: ${safe(yp.summary_risk_level || "—")}<br>
      What helps: ${safe(communication.what_helps || "—")}<br>
      Signs of distress: ${safe(communication.signs_of_distress || "—")}<br>
      Education: ${safe(education.education_status || "—")}<br>
      Mental health: ${safe(health.mental_health_summary || "—")}
    `;
  }

  function renderRightRail(overview) {
    const host = document.getElementById("liveRightRail");
    if (!host) return;

    const yp = overview?.young_person || {};
    const alerts = Array.isArray(overview?.alerts) ? overview.alerts.filter(alert => alert?.is_active) : [];

    host.innerHTML = `
      <div class="snapshot-item">
        <div class="snapshot-title">Immediate risks</div>
        <div class="snapshot-text">
          ${alerts.length
            ? safe(alerts.map(alert => alert.title).slice(0, 3).join(", "))
            : "No immediate active alerts recorded."}
        </div>
      </div>

      <div class="snapshot-item">
        <div class="snapshot-title">What needs action</div>
        <div class="snapshot-text">
          Review incidents, notes, follow-up tasks, and unresolved concerns for ${safe(fullName(yp))}.
        </div>
      </div>
    `;
  }

  function buildSimpleSectionCard(title, text, helper = "") {
    return `
      <div class="workspace-demo">
        <div class="workspace-banner">
          <h3>${safe(title)}</h3>
          <p>${safe(text)}</p>
        </div>
        ${
          helper
            ? `
              <div class="workspace-section">
                <h4>What belongs here</h4>
                <div class="workspace-helper-list">
                  <div>${safe(helper)}</div>
                </div>
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderAreaSections(overview) {
    const yp = overview?.young_person || selectedYoungPerson || {};
    const personName = fullName(yp);

    const daily = document.getElementById("dailyNotesSection");
    const incidents = document.getElementById("incidentsSection");
    const health = document.getElementById("healthSection");
    const education = document.getElementById("educationSection");
    const family = document.getElementById("familySection");
    const keywork = document.getElementById("keyworkSection");
    const risk = document.getElementById("riskSection");
    const timeline = document.getElementById("timelineSection");

    if (daily) {
      daily.innerHTML = buildSimpleSectionCard(
        `Daily notes for ${personName}`,
        "Use this area to review daily note activity and open the modal to add a new note without leaving the page.",
        "Presentation, routines, support used, emotional wellbeing, risks, and handover points."
      );
    }

    if (incidents) {
      incidents.innerHTML = buildSimpleSectionCard(
        `Incidents for ${personName}`,
        "Use this area to review incidents and open the modal to record a new incident when needed.",
        "Clear factual accounts, safeguarding concerns, injuries, missing episodes, and follow-up."
      );
    }

    if (health) {
      health.innerHTML = buildSimpleSectionCard(
        `Health for ${personName}`,
        "Appointments, medication, symptoms, injuries, and wellbeing can be reviewed here.",
        "Medication, symptoms, appointments, refusals, injuries, and health-related concerns."
      );
    }

    if (education) {
      education.innerHTML = buildSimpleSectionCard(
        `Education for ${personName}`,
        "Keep attendance, provision, engagement, and school communication visible.",
        "Attendance, barriers, engagement, support, and educational progress."
      );
    }

    if (family) {
      family.innerHTML = buildSimpleSectionCard(
        `Family and contact for ${personName}`,
        "Review contact arrangements and emotional impact in one place.",
        "Planned contact, supervision, restrictions, emotional impact, and follow-up."
      );
    }

    if (keywork) {
      keywork.innerHTML = buildSimpleSectionCard(
        `Keywork for ${personName}`,
        "Keep goals, themes, reflections, and the young person’s voice together.",
        "Session themes, voice, goals, reflection, progress, and next steps."
      );
    }

    if (risk) {
      risk.innerHTML = buildSimpleSectionCard(
        `Risk for ${personName}`,
        "Review current risks, patterns, and immediate concerns in one focused area.",
        "Triggers, warning signs, protective factors, staff responses, escalation, and review points."
      );
    }

    if (timeline) {
      timeline.innerHTML = buildSimpleSectionCard(
        `Timeline for ${personName}`,
        "A joined-up chronology should make it easier to see patterns across the placement.",
        "Daily notes, incidents, health, education, family contact, and keywork in one place."
      );
    }
  }

  async function loadYoungPeople() {
    const data = await api("/young-people");
    youngPeople = Array.isArray(data?.young_people) ? data.young_people : [];
    applyYoungPersonFilters();

    if (!selectedYoungPerson && filteredYoungPeople.length) {
      selectedYoungPerson = filteredYoungPeople[0];
      renderYoungPersonSelect();
      await loadYoungPersonOverview(selectedYoungPerson.id);
    }
  }

  async function loadYoungPersonOverview(id) {
    const data = await api(`/young-people/${id}/overview`);
    const overview = data?.overview || {};

    latestOverview = overview;
    selectedYoungPerson = overview?.young_person || selectedYoungPerson;

    renderYoungPersonSelect();
    renderContextStrip();
    renderOverview(overview);
    renderProfileTab(overview);
    renderAssistantContext(overview);
    renderRightRail(overview);
    renderAreaSections(overview);
    setActiveSectionTab(activeSectionTab);
  }

  function bindProfileTabs() {
    document.querySelectorAll("[data-profile-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-profile-tab]").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        activeProfileTab = btn.getAttribute("data-profile-tab");
        if (latestOverview) renderProfileTab(latestOverview);
      });
    });
  }

  function bindSectionTabs() {
    document.querySelectorAll("[data-section-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        setActiveSectionTab(btn.getAttribute("data-section-tab"));
      });
    });
  }

  function bindShiftModeTabs() {
    document.querySelectorAll("[data-shift-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        setActiveShiftMode(btn.getAttribute("data-shift-mode"));
      });
    });
  }

  function bindSelectControls() {
    document.getElementById("youngPersonSelect")?.addEventListener("change", async event => {
      const id = Number(event.target.value || 0);

      if (!id) {
        selectedYoungPerson = null;
        latestOverview = null;
        clearDashboard();
        return;
      }

      const person =
        filteredYoungPeople.find(p => Number(p.id) === id) ||
        youngPeople.find(p => Number(p.id) === id);

      if (!person) return;

      selectedYoungPerson = person;
      await loadYoungPersonOverview(id);
    });

    document.getElementById("youngPersonSearch")?.addEventListener("input", applyYoungPersonFilters);
    document.getElementById("youngPersonStatusFilter")?.addEventListener("change", applyYoungPersonFilters);
  }

  function bindQuickActions() {
    document.getElementById("quickCaptureBtn")?.addEventListener("click", () => {
      if (!selectedYoungPerson) {
        alert("Select a young person first.");
        return;
      }
      openModal("quickCaptureModal");
    });

    document.querySelectorAll("[data-quick-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedYoungPerson) {
          alert("Select a young person first.");
          return;
        }

        const type = btn.getAttribute("data-quick-open");

        if (type === "daily-note") {
          setActiveSectionTab("daily-notes");
          openModal("daily-note-modal");
        }

        if (type === "incident") {
          setActiveSectionTab("incidents");
          openModal("incident-modal");
        }

        if (type === "health") {
          setActiveSectionTab("health");
          openModal("health-modal");
        }
      });
    });

    document.querySelectorAll("[data-open-modal]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedYoungPerson) {
          alert("Select a young person first.");
          return;
        }

        openModal(btn.getAttribute("data-open-modal"));
      });
    });

    document.querySelectorAll("[data-capture-type]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedYoungPerson) {
          alert("Select a young person first.");
          return;
        }

        const type = btn.getAttribute("data-capture-type");
        closeAllModals();

        if (type === "daily-note") {
          setActiveSectionTab("daily-notes");
          openModal("daily-note-modal");
          return;
        }

        if (type === "incident") {
          setActiveSectionTab("incidents");
          openModal("incident-modal");
          return;
        }

        if (type === "health") {
          setActiveSectionTab("health");
          openModal("health-modal");
          return;
        }

        if (type === "family") {
          setActiveSectionTab("family");
          openModal("family-modal");
          return;
        }

        if (type === "keywork") {
          setActiveSectionTab("keywork");
          openModal("keywork-modal");
          return;
        }

        if (type === "risk") {
          setActiveSectionTab("risk");
          openModal("risk-modal");
        }
      });
    });
  }

  function bindModalCloseActions() {
    document.getElementById("closeQuickCaptureBtn")?.addEventListener("click", closeAllModals);

    document.querySelectorAll("[data-close-modal='true']").forEach(el => {
      el.addEventListener("click", closeAllModals);
    });

    document.querySelectorAll("[data-close-modal-btn='true']").forEach(btn => {
      btn.addEventListener("click", closeAllModals);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeAllModals();
    });
  }

  function bindAssistantActions() {
    document.getElementById("openAssistantBtn")?.addEventListener("click", async () => {
      if (!selectedYoungPerson) {
        alert("Select a young person first.");
        return;
      }

      const prompt = [
        `Young person: ${fullName(selectedYoungPerson)}`,
        `Preferred name: ${selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || ""}`,
        `Placement status: ${selectedYoungPerson.placement_status || ""}`,
        `Risk level: ${selectedYoungPerson.summary_risk_level || ""}`,
        "",
        "Use this young person as the working context for notes, reviews, and handover."
      ].join("\n");

      try {
        await navigator.clipboard.writeText(prompt);
        alert("Assistant context copied.");
      } catch {
        alert(prompt);
      }
    });

    document.querySelectorAll("[data-assistant-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedYoungPerson) {
          alert("Select a young person first.");
          return;
        }
        alert(`Next step: connect "${btn.getAttribute("data-assistant-action")}" to your assistant workflow.`);
      });
    });
  }

  async function init() {
    bindProfileTabs();
    bindSectionTabs();
    bindShiftModeTabs();
    bindSelectControls();
    bindQuickActions();
    bindModalCloseActions();
    bindAssistantActions();

    clearDashboard();

    try {
      await loadYoungPeople();
    } catch (error) {
      console.error(error);
      const overviewPanel = document.getElementById("overviewPanel");
      if (overviewPanel) {
        overviewPanel.innerHTML = `
          <div class="empty-state">
            Could not load young people.<br>
            <span>${safe(error.message || "Unknown error")}</span>
          </div>
        `;
      }
    }
  }

  return {
    init
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.ChildrensHomeOS.init();
});
