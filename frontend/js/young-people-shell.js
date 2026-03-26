window.ChildrensHomeOS = (function () {
  let youngPeople = [];
  let filteredYoungPeople = [];
  let selectedYoungPerson = null;
  let latestOverview = null;

  let activeProfileTab = "identity";
  let activeWorkspace = "daily-note";
  let activeShiftMode = "during";

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

  function getTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function openSidebar() {
    document.getElementById("ypSidebar")?.classList.add("open");
  }

  function closeSidebar() {
    document.getElementById("ypSidebar")?.classList.remove("open");
  }

  function setActiveShiftMode(mode) {
    activeShiftMode = mode;
    document.querySelectorAll("[data-shift-mode]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-shift-mode") === mode);
    });
    renderShiftPanel();
  }

  function renderYoungPersonList() {
    const host = document.getElementById("youngPersonList");
    if (!host) return;

    if (!filteredYoungPeople.length) {
      host.innerHTML = `<div class="empty-state compact">No young people match your filters.</div>`;
      return;
    }

    host.innerHTML = filteredYoungPeople.map(person => `
      <button
        type="button"
        class="young-person-card ${Number(person.id) === Number(selectedYoungPerson?.id) ? "active" : ""}"
        data-young-person-id="${safe(person.id)}"
      >
        <div class="young-person-card-top">
          <div class="young-person-avatar">${safe(initials(person))}</div>
          <div class="young-person-card-main">
            <div class="young-person-card-name">${safe(fullName(person))}</div>
            <div class="young-person-card-meta">
              ${safe(person.placement_status || "Placement not set")}
            </div>
          </div>
        </div>

        <div class="tag-row">
          <span class="tag ${riskTagClass(person.summary_risk_level)}">${safe(person.summary_risk_level || "risk not set")}</span>
          <span class="tag ${person.archived ? "warn" : "good"}">${person.archived ? "archived" : "active"}</span>
        </div>
      </button>
    `).join("");

    host.querySelectorAll("[data-young-person-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-young-person-id") || 0);
        if (!id) return;

        const person = youngPeople.find(p => Number(p.id) === id);
        if (!person) return;

        selectedYoungPerson = person;
        renderYoungPersonList();
        closeSidebar();
        await loadYoungPersonOverview(id);
      });
    });
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
        ].filter(Boolean).join(" ").toLowerCase();

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
    renderYoungPersonList();

    if (
      selectedYoungPerson &&
      !filteredYoungPeople.some(person => Number(person.id) === Number(selectedYoungPerson.id))
    ) {
      selectedYoungPerson = null;
      latestOverview = null;
      clearDashboard();
    }
  }

  function clearDashboard() {
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const overviewPanel = document.getElementById("overviewPanel");
    const profileTabContent = document.getElementById("profileTabContent");
    const workspaceMount = document.getElementById("workspaceMount");
    const assistantContextBox = document.getElementById("assistantContextBox");
    const liveRightRail = document.getElementById("liveRightRail");
    const shiftPanel = document.getElementById("shiftPanel");

    if (pageTitle) pageTitle.textContent = "Children’s Home OS";
    if (pageSubtitle) pageSubtitle.textContent = "Shift-aware care, records, plans, safeguarding, and oversight";

    if (overviewPanel) {
      overviewPanel.innerHTML = `<div class="empty-state">Select a young person to open their dashboard.</div>`;
    }

    if (profileTabContent) {
      profileTabContent.innerHTML = `<div class="empty-state compact">Profile content will appear here once a young person is selected.</div>`;
    }

    if (workspaceMount) {
      workspaceMount.innerHTML = `<div class="empty-state">Select a young person to load a workspace.</div>`;
    }

    if (assistantContextBox) {
      assistantContextBox.innerHTML = `Choose a young person and this area will build context for notes, handovers, plans, and reviews.`;
    }

    if (liveRightRail) {
      liveRightRail.innerHTML = `
        <div class="snapshot-item">
          <div class="snapshot-title">Live care feed</div>
          <div class="snapshot-text">Select a young person to surface alerts, due actions, and next steps.</div>
        </div>
      `;
    }

    if (shiftPanel) {
      renderShiftPanel();
    }

    renderYoungPersonList();
  }

  function renderShiftPanel() {
    const host = document.getElementById("shiftPanel");
    if (!host) return;

    if (activeShiftMode === "start") {
      host.innerHTML = `
        <div class="shift-card">
          <div class="shift-card-title">Start shift focus</div>
          <div class="shift-card-text">Review alerts, incidents since last shift, appointments today, and missing records before staff begin care tasks.</div>
        </div>
        <div class="shift-checklist">
          <div class="check-row">Review handover</div>
          <div class="check-row">Check high-risk alerts</div>
          <div class="check-row">Confirm education / appointments</div>
          <div class="check-row">Identify overdue records</div>
        </div>
      `;
      return;
    }

    if (activeShiftMode === "during") {
      host.innerHTML = `
        <div class="shift-card">
          <div class="shift-card-title">During shift focus</div>
          <div class="shift-card-text">Capture events quickly, keep daily notes live, and follow alerts, appointments, and support needs as the day changes.</div>
        </div>
        <div class="shift-checklist">
          <div class="check-row">Record significant events promptly</div>
          <div class="check-row">Update daily note as you go</div>
          <div class="check-row">Log health / contact / education events</div>
          <div class="check-row">Create follow-up tasks immediately</div>
        </div>
      `;
      return;
    }

    host.innerHTML = `
      <div class="shift-card">
        <div class="shift-card-title">End shift focus</div>
        <div class="shift-card-text">Finish key records, confirm unresolved issues, and leave a handover that helps the next staff team start safely.</div>
      </div>
      <div class="shift-checklist">
        <div class="check-row">Complete daily note</div>
        <div class="check-row">Finalise incidents</div>
        <div class="check-row">List next actions</div>
        <div class="check-row">Generate handover summary</div>
      </div>
    `;
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

              <div class="human-strip">
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
                  : `<div class="muted-line">No active alerts recorded.</div>`
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
      const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
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

    const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];
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
      <strong class="assistant-heading">Assistant context for ${safe(fullName(yp))}</strong>
      <div class="assistant-prompt">
        Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
        Placement: ${safe(yp.placement_status || "—")}<br>
        Risk level: ${safe(yp.summary_risk_level || "—")}<br>
        What helps: ${safe(communication.what_helps || "—")}<br>
        Signs of distress: ${safe(communication.signs_of_distress || "—")}<br>
        Education: ${safe(education.education_status || "—")}<br>
        Mental health: ${safe(health.mental_health_summary || "—")}
      </div>
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
          Review incidents, daily notes, follow-up tasks, and any unresolved safeguarding or health concerns for ${safe(fullName(yp))}.
        </div>
      </div>

      <div class="snapshot-item">
        <div class="snapshot-title">Today’s care focus</div>
        <div class="snapshot-text">
          Keep recording linked, clear, factual, and therapeutic. Use quick actions to reduce duplication and build handover as the shift progresses.
        </div>
      </div>
    `;
  }

  async function loadYoungPeople() {
    const data = await api("/young-people");
    youngPeople = Array.isArray(data?.young_people) ? data.young_people : [];
    applyYoungPersonFilters();

    if (!selectedYoungPerson && filteredYoungPeople.length) {
      selectedYoungPerson = filteredYoungPeople[0];
      renderYoungPersonList();
      await loadYoungPersonOverview(selectedYoungPerson.id);
    }
  }

  async function loadYoungPersonOverview(id) {
    const data = await api(`/young-people/${id}/overview`);
    const overview = data?.overview || {};

    latestOverview = overview;
    selectedYoungPerson = overview?.young_person || selectedYoungPerson;

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");

    if (pageTitle) pageTitle.textContent = fullName(selectedYoungPerson);
    if (pageSubtitle) {
      pageSubtitle.textContent = `Placement: ${selectedYoungPerson?.placement_status || "—"} · Risk: ${selectedYoungPerson?.summary_risk_level || "—"}`;
    }

    renderYoungPersonList();
    renderOverview(overview);
    renderProfileTab(overview);
    renderAssistantContext(overview);
    renderRightRail(overview);
    renderWorkspace(activeWorkspace);
  }

  function renderWorkspace(workspaceName) {
    activeWorkspace = workspaceName;

    document.querySelectorAll("[data-workspace]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-workspace") === workspaceName);
    });

    const mount = document.getElementById("workspaceMount");
    if (!mount) return;

    if (!selectedYoungPerson) {
      mount.innerHTML = `<div class="empty-state">Select a young person to load a workspace.</div>`;
      return;
    }

    const personName = fullName(selectedYoungPerson);

    if (workspaceName === "record") {
      mount.innerHTML = `
        <div class="record-form-grid">
          <div class="card">
            <h3>Quick record</h3>

            <div class="form-block">
              <label for="recordType">What do you need to record?</label>
              <select id="recordType" class="select">
                <option>Incident</option>
                <option>Daily note update</option>
                <option>Health event</option>
                <option>Education event</option>
                <option>Family contact</option>
                <option>Keywork session</option>
                <option>Behaviour concern</option>
              </select>
            </div>

            <div class="form-row-2">
              <div class="form-block">
                <label for="recordDate">Date</label>
                <input id="recordDate" class="field" type="date" value="${getTodayString()}">
              </div>
              <div class="form-block">
                <label for="recordTime">Time</label>
                <input id="recordTime" class="field" type="time">
              </div>
            </div>

            <div class="form-block">
              <label for="recordSummary">Brief summary</label>
              <input id="recordSummary" class="field" type="text" placeholder="What happened?">
            </div>

            <div class="form-block">
              <label for="recordDetails">Details</label>
              <textarea id="recordDetails" class="textarea" placeholder="Write the factual account here."></textarea>
            </div>

            <div class="record-action-bar">
              <button class="secondary-btn" type="button">Save draft</button>
              <button class="primary-btn" type="button">Save record</button>
            </div>
          </div>

          <div class="record-side-stack">
            <div class="doc-ai-panel">
              <div class="doc-ai-panel-head">
                <h3>Linked outputs</h3>
                <p>One good record should update other parts of the system.</p>
              </div>
              <div class="doc-ai-list">
                <div class="doc-ai-item"><strong>Will inform</strong><p>Timeline, handover, review work, and oversight.</p></div>
                <div class="doc-ai-item"><strong>Can trigger</strong><p>Risk review, safeguarding review, or follow-up task creation.</p></div>
              </div>
            </div>

            <div class="doc-ai-panel">
              <div class="doc-ai-panel-head">
                <h3>Writing prompts</h3>
                <p>Helpful prompts for staff under pressure.</p>
              </div>
              <div class="doc-ai-list">
                <div class="doc-ai-item"><strong>Before</strong><p>What was happening before the event?</p></div>
                <div class="doc-ai-item"><strong>During</strong><p>What did the young person communicate or show?</p></div>
                <div class="doc-ai-item"><strong>After</strong><p>What did staff do and what happened next?</p></div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (workspaceName === "review") {
      mount.innerHTML = `
        <div class="timeline-group">
          <div class="timeline-date">Recent chronology for ${safe(personName)}</div>
          <div class="timeline-items">
            <div class="timeline-item">
              <div class="timeline-item-head">
                <div>
                  <div class="timeline-item-title">Daily note updated</div>
                  <div class="timeline-item-meta">Today · Staff entry · Linked to handover</div>
                </div>
                <span class="tag good">complete</span>
              </div>
              <div class="timeline-item-body">
                <p>Chronology entries, incidents, health items, and care notes should appear here in one joined-up view.</p>
              </div>
            </div>

            <div class="timeline-item">
              <div class="timeline-item-head">
                <div>
                  <div class="timeline-item-title">Risk review suggested</div>
                  <div class="timeline-item-meta">Yesterday · Behaviour pattern · Follow-up needed</div>
                </div>
                <span class="tag warn">review</span>
              </div>
              <div class="timeline-item-body">
                <p>The review view should surface linked events, patterns, and incomplete follow-up.</p>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (workspaceName === "plan") {
      mount.innerHTML = `
        <div class="card">
          <h3>Care and planning workspace</h3>

          <div class="mini-item">
            <strong>Support plans</strong>
            <p>Plans should be live, plain English, and updated from real events rather than rewritten from scratch.</p>
          </div>

          <div class="mini-item">
            <strong>Risk plans</strong>
            <p>Show triggers, early signs, what staff should do, what to avoid, escalation steps, and links to recent incidents.</p>
          </div>

          <div class="mini-item">
            <strong>Review cycle</strong>
            <p>When incidents or concerns are added, suggest plan review automatically.</p>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="empty-state">
        This workspace is not built yet.
      </div>
    `;
  }

  function bindProfileTabs() {
    document.querySelectorAll("[data-profile-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-profile-tab]").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        activeProfileTab = btn.getAttribute("data-profile-tab");
        if (latestOverview) {
          renderProfileTab(latestOverview);
        }
      });
    });
  }

  function bindWorkspaceTabs() {
    document.querySelectorAll("[data-workspace]").forEach(btn => {
      btn.addEventListener("click", () => {
        renderWorkspace(btn.getAttribute("data-workspace"));
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

  function bindActions() {
    document.getElementById("refreshYoungPeopleBtn")?.addEventListener("click", loadYoungPeople);
    document.getElementById("openSidebarBtn")?.addEventListener("click", openSidebar);
    document.getElementById("closeSidebarBtn")?.addEventListener("click", closeSidebar);

    document.getElementById("youngPersonSearch")?.addEventListener("input", applyYoungPersonFilters);
    document.getElementById("youngPersonStatusFilter")?.addEventListener("change", applyYoungPersonFilters);

    document.getElementById("newYoungPersonBtn")?.addEventListener("click", () => {
      alert("Next step: connect this to a create young person modal.");
    });

    document.getElementById("quickCaptureBtn")?.addEventListener("click", () => {
      if (!selectedYoungPerson) {
        alert("Select a young person first.");
        return;
      }
      activeWorkspace = "record";
      renderWorkspace("record");
    });

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
    bindWorkspaceTabs();
    bindShiftModeTabs();
    bindActions();
    clearDashboard();
    renderShiftPanel();

    try {
      await loadYoungPeople();
    } catch (error) {
      console.error(error);
      const overviewPanel = document.getElementById("overviewPanel");
      if (overviewPanel) {
        overviewPanel.innerHTML = `
          <div class="empty-state">
            Could not load young people.<br>
            <span class="muted-line">${safe(error.message || "Unknown error")}</span>
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
